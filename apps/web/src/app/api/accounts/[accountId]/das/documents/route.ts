import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  isDasDocumentType,
  serializeDasDocument,
  type DasDocumentType,
} from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const contactId = url.searchParams.get('contactId');
  const q = url.searchParams.get('q')?.trim();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      d.id,
      d.account_id as "accountId",
      d.contact_id as "contactId",
      d.client_id as "clientId",
      d.template_id as "templateId",
      d.type,
      d.title,
      d.status,
      d.structured_data as "structuredData",
      d.html_snapshot as "htmlSnapshot",
      d.created_by as "createdBy",
      d.finalized_at as "finalizedAt",
      d.created_at as "createdAt",
      d.updated_at as "updatedAt",
      c.name as "contactName",
      count(*) OVER() as "totalCount"
    FROM das_documents d
    LEFT JOIN contacts c ON c.id = d.contact_id
    WHERE d.account_id = ${accountId}::uuid
      AND (${status}::text IS NULL OR d.status = ${status})
      AND (${type}::text IS NULL OR d.type = ${type})
      AND (${contactId}::uuid IS NULL OR d.contact_id = ${contactId}::uuid)
      AND (
        ${q ?? null}::text IS NULL
        OR d.title ILIKE '%' || ${q ?? ''} || '%'
      )
    ORDER BY d.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const total = Number((rows[0] as { totalCount?: number } | undefined)?.totalCount ?? 0);
  const documents = rows.map((r) => {
    const row = r as Record<string, unknown> & { totalCount?: number };
    const { totalCount: _, ...doc } = row;
    return serializeDasDocument(
      doc as Parameters<typeof serializeDasDocument>[0]
    );
  });

  return Response.json({ documents, total });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    type?: string;
    title?: string;
    contactId?: string | null;
    templateId?: string | null;
    structuredData?: Record<string, unknown>;
  };

  const type = body.type?.trim() ?? '';
  if (!isDasDocumentType(type)) {
    return Response.json(
      { error: 'type must be quotation, invoice, proposal, sla, nda, or other' },
      { status: 400 }
    );
  }

  const title = body.title?.trim();
  if (!title) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.contactId) {
    const contacts = await sql`
      SELECT id FROM contacts
      WHERE id = ${body.contactId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    if (!contacts[0]) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }
  }

  let templateId = body.templateId ?? null;
  if (templateId) {
    const templates = await sql`
      SELECT id FROM das_templates
      WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    if (!templates[0]) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
  } else {
    const autoTemplates = await sql`
      SELECT id FROM das_templates
      WHERE account_id = ${accountId}::uuid
        AND type = ${type}
        AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    `;
    templateId = (autoTemplates[0] as { id: string } | undefined)?.id ?? null;
  }

  const rows = await sql`
    INSERT INTO das_documents (
      account_id,
      contact_id,
      template_id,
      type,
      title,
      status,
      structured_data,
      created_by
    )
    VALUES (
      ${accountId}::uuid,
      ${body.contactId ?? null}::uuid,
      ${templateId}::uuid,
      ${type as DasDocumentType},
      ${title},
      'draft',
      ${JSON.stringify(body.structuredData ?? {})}::jsonb,
      ${auth.userId}::uuid
    )
    RETURNING
      id,
      account_id as "accountId",
      contact_id as "contactId",
      client_id as "clientId",
      template_id as "templateId",
      type,
      title,
      status,
      structured_data as "structuredData",
      html_snapshot as "htmlSnapshot",
      created_by as "createdBy",
      finalized_at as "finalizedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const document = serializeDasDocument(
    rows[0] as Parameters<typeof serializeDasDocument>[0]
  );

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'document',
      ${document.id}::uuid,
      'created',
      ${auth.userId}::uuid,
      ${JSON.stringify({ type, title })}::jsonb
    )
  `;

  return Response.json({ document }, { status: 201 });
}
