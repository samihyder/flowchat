import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';
import { linkContactToGlobalCompany } from '@/lib/companies/resolve';
import { triggerMarketingWorkflows } from '@/lib/marketing/workflow-triggers';
import { validateCustomAttributes, serializeDefinitionRow } from '@/lib/custom-attributes';
import { listContacts } from '@/lib/contacts-query';
import { getAccountSettings } from '@/lib/account-settings-db';
import { sendDoubleOptInEmail } from '@/lib/marketing/double-opt-in';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

const VALID_TYPES = ['visitor', 'lead', 'customer'] as const;

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  if (type && !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return Response.json({ error: 'Invalid type filter' }, { status: 400 });
  }

  const idsParam = url.searchParams.get('ids');
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : null;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await listContacts(sql, {
    accountId,
    q: url.searchParams.get('q')?.trim(),
    type,
    labelId: url.searchParams.get('labelId'),
    marketingStatus: url.searchParams.get('marketingStatus'),
    country: url.searchParams.get('country'),
    hasAutomation: url.searchParams.get('hasAutomation'),
    ids,
    sort: url.searchParams.get('sort') ?? 'last_activity_at',
    orderAsc: url.searchParams.get('order') === 'asc',
    limit: Number(url.searchParams.get('limit') ?? 50),
    offset: Number(url.searchParams.get('offset') ?? 0),
  });

  const total = (rows[0] as { totalCount?: number } | undefined)?.totalCount ?? 0;
  const contacts = rows.map((r) => {
    const row = r as Record<string, unknown> & { totalCount?: number };
    const { totalCount: _, ...contact } = row;
    return {
      ...contact,
      labels: contact.labels ?? [],
      createdAt: new Date(contact.createdAt as Date | string).toISOString(),
      updatedAt: new Date(contact.updatedAt as Date | string).toISOString(),
      lastActivityAt: contact.lastActivityAt
        ? new Date(contact.lastActivityAt as Date | string).toISOString()
        : null,
    };
  });

  return Response.json({ contacts, total });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    country?: string | null;
    labelIds?: string[];
    customAttributes?: Record<string, unknown>;
  };

  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  const type = body.type?.trim() ?? 'lead';
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return Response.json({ error: 'Invalid contact type' }, { status: 400 });
  }

  let country: string | null = null;
  if (body.country) {
    const upper = body.country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) {
      return Response.json({ error: 'Invalid country code' }, { status: 400 });
    }
    country = upper;
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const defRows = await sql`
    SELECT id, entity_type as "entityType", key, label, attr_type as "attrType", options, sort_order as "sortOrder"
    FROM custom_attribute_definitions
    WHERE account_id = ${accountId}::uuid AND entity_type = 'contact'
  `;
  const definitions = (defRows as Record<string, unknown>[]).map(serializeDefinitionRow);
  const { valid: customAttributes, errors } = validateCustomAttributes(definitions, body.customAttributes);
  if (errors.length > 0) {
    return Response.json({ error: errors.join('; ') }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO contacts (account_id, name, email, phone, country, type, custom_attributes, last_activity_at)
    VALUES (
      ${accountId}::uuid,
      ${name},
      ${body.email?.trim() || null},
      ${body.phone?.trim() || null},
      ${country},
      ${type},
      ${JSON.stringify(customAttributes)}::jsonb,
      NOW()
    )
    RETURNING id, name, email, phone, country, type, external_id as "externalId",
              custom_attributes as "customAttributes",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;

  const contact = rows[0] as { id: string };
  if (rows[0]) {
    await linkContactToGlobalCompany(sql, contact.id, body.email?.trim() || null, accountId);
    await emitContactEvent(
      sql,
      accountId,
      'contact.created',
      serializeContactRow(rows[0] as Record<string, unknown>)
    );
  }
  if (body.labelIds?.length && contact) {
    for (const labelId of body.labelIds) {
      await sql`
        INSERT INTO contact_labels (contact_id, label_id)
        SELECT ${contact.id}::uuid, ${labelId}::uuid
        WHERE EXISTS (SELECT 1 FROM labels WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid)
        ON CONFLICT DO NOTHING
      `;
    }
  }

  const email = body.email?.trim();
  if (contact && email) {
    const settings = await getAccountSettings(sql, accountId);
    if (settings.marketingDoubleOptIn) {
      await sendDoubleOptInEmail(sql, accountId, contact.id, settings, {
        to: email,
        name,
      });
    } else {
      await triggerMarketingWorkflows(sql, accountId, 'contact_created', contact.id);
    }
  }

  return Response.json({ contact: rows[0] }, { status: 201 });
}
