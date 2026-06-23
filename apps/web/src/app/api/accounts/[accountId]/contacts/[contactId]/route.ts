import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';
import { getGlobalCompanyById, linkContactToGlobalCompany, toCompanySummary } from '@/lib/companies/resolve';
import { triggerMarketingWorkflows } from '@/lib/marketing/workflow-triggers';
import { validateCustomAttributes, serializeDefinitionRow } from '@/lib/custom-attributes';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; contactId: string }> };

const VALID_TYPES = ['visitor', 'lead', 'customer'] as const;

export async function GET(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT c.id, c.name, c.email, c.phone, c.type, c.external_id as "externalId",
           c.avatar_url as "avatarUrl", c.company_id as "companyId",
           c.enrichment_status as "enrichmentStatus",
           c.enrichment_provider as "enrichmentProvider",
           c.enriched_at as "enrichedAt",
           c.custom_attributes as "customAttributes",
           c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
           c.blocked_at as "blockedAt", c.created_at as "createdAt", c.updated_at as "updatedAt"
    FROM contacts c
    WHERE c.id = ${contactId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!rows[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  const companyId = (rows[0] as { companyId?: string | null }).companyId;
  const company = companyId ? await getGlobalCompanyById(sql, companyId) : null;

  const [labels, conversations, notes] = await Promise.all([
    sql`
      SELECT l.id, l.name, l.color
      FROM contact_labels cl
      INNER JOIN labels l ON l.id = cl.label_id
      WHERE cl.contact_id = ${contactId}::uuid
    `,
    sql`
      SELECT c.id, c.status, c.inbox_id as "inboxId", i.name as "inboxName",
             c.last_message_at as "lastMessageAt", c.created_at as "createdAt"
      FROM conversations c
      INNER JOIN inboxes i ON i.id = c.inbox_id
      WHERE c.contact_id = ${contactId}::uuid AND c.account_id = ${accountId}::uuid
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT 20
    `,
    sql`
      SELECT n.id, n.content, n.created_at as "createdAt", n.updated_at as "updatedAt",
             u.name as "authorName"
      FROM contact_notes n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.contact_id = ${contactId}::uuid
      ORDER BY n.created_at DESC
    `,
  ]);

  return Response.json({
    contact: {
      ...rows[0],
      customAttributes: (rows[0] as { customAttributes?: Record<string, unknown> }).customAttributes ?? {},
      createdAt: new Date((rows[0] as { createdAt: Date }).createdAt).toISOString(),
      updatedAt: new Date((rows[0] as { updatedAt: Date }).updatedAt).toISOString(),
      lastActivityAt: (rows[0] as { lastActivityAt: Date | null }).lastActivityAt
        ? new Date((rows[0] as { lastActivityAt: Date }).lastActivityAt).toISOString()
        : null,
      blockedAt: (rows[0] as { blockedAt: Date | null }).blockedAt
        ? new Date((rows[0] as { blockedAt: Date }).blockedAt).toISOString()
        : null,
      enrichedAt: (rows[0] as { enrichedAt: Date | null }).enrichedAt
        ? new Date((rows[0] as { enrichedAt: Date }).enrichedAt).toISOString()
        : null,
      company: company ? toCompanySummary(company) : null,
    },
    labels,
    conversations: (conversations as { lastMessageAt: Date | null; createdAt: Date }[]).map((c) => ({
      ...c,
      lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : null,
      createdAt: new Date(c.createdAt).toISOString(),
    })),
    notes: (notes as { createdAt: Date; updatedAt: Date }[]).map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt).toISOString(),
      updatedAt: new Date(n.updatedAt).toISOString(),
    })),
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    labelIds?: string[];
    customAttributes?: Record<string, unknown>;
  };

  if (body.type && !VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])) {
    return Response.json({ error: 'Invalid contact type' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await sql`
    SELECT id FROM contacts WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  let customAttributesJson: string | null = null;
  if (body.customAttributes !== undefined) {
    const defRows = await sql`
      SELECT id, entity_type as "entityType", key, label, attr_type as "attrType", options, sort_order as "sortOrder"
      FROM custom_attribute_definitions
      WHERE account_id = ${accountId}::uuid AND entity_type = 'contact'
    `;
    const definitions = (defRows as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      entityType: r.entityType as 'contact',
      key: r.key as string,
      label: r.label as string,
      attrType: r.attrType as 'text',
      options: (r.options as string[] | null) ?? null,
      sortOrder: Number(r.sortOrder ?? 0),
    }));
    const { valid, errors } = validateCustomAttributes(definitions, body.customAttributes);
    if (errors.length > 0) {
      return Response.json({ error: errors.join('; ') }, { status: 400 });
    }
    customAttributesJson = JSON.stringify(valid);
  }

  const rows = await sql`
    UPDATE contacts SET
      name = COALESCE(${body.name?.trim() ?? null}, name),
      email = CASE WHEN ${body.email !== undefined} THEN ${body.email?.trim() || null} ELSE email END,
      phone = CASE WHEN ${body.phone !== undefined} THEN ${body.phone?.trim() || null} ELSE phone END,
      type = COALESCE(${body.type ?? null}, type),
      custom_attributes = CASE WHEN ${customAttributesJson !== null} THEN ${customAttributesJson}::jsonb ELSE custom_attributes END,
      updated_at = NOW()
    WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, email, phone, type, external_id as "externalId",
              custom_attributes as "customAttributes",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;

  if (rows[0]) {
    const updated = rows[0] as { id: string; email: string | null };
    await linkContactToGlobalCompany(
      sql,
      updated.id,
      body.email !== undefined ? body.email?.trim() || null : updated.email,
      accountId
    );
    await emitContactEvent(
      sql,
      accountId,
      'contact.updated',
      serializeContactRow(rows[0] as Record<string, unknown>)
    );
  }

  if (body.labelIds) {
    const oldLabels = await sql`
      SELECT label_id as "labelId" FROM contact_labels WHERE contact_id = ${contactId}::uuid
    `;
    const oldSet = new Set((oldLabels as { labelId: string }[]).map((r) => r.labelId));

    await sql`DELETE FROM contact_labels WHERE contact_id = ${contactId}::uuid`;
    for (const labelId of body.labelIds) {
      await sql`
        INSERT INTO contact_labels (contact_id, label_id)
        SELECT ${contactId}::uuid, ${labelId}::uuid
        WHERE EXISTS (SELECT 1 FROM labels WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid)
        ON CONFLICT DO NOTHING
      `;
      if (!oldSet.has(labelId)) {
        await triggerMarketingWorkflows(sql, accountId, 'label_added', contactId, { labelId });
      }
    }
  }

  return Response.json({ contact: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required to delete contacts' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await sql`
    DELETE FROM contacts WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!result[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  await emitContactEvent(sql, accountId, 'contact.deleted', { id: contactId });
  return Response.json({ ok: true });
}
