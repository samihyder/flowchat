import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  isDasDocumentType,
  serializeDasTemplate,
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
  const type = url.searchParams.get('type');
  const activeParam = url.searchParams.get('active');
  const active =
    activeParam === null
      ? null
      : activeParam === 'true' || activeParam === '1'
        ? true
        : activeParam === 'false' || activeParam === '0'
          ? false
          : null;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      id,
      account_id as "accountId",
      name,
      type,
      version,
      body,
      handlebars_html as "handlebarsHtml",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM das_templates
    WHERE account_id = ${accountId}::uuid
      AND (${type}::text IS NULL OR type = ${type})
      AND (${active}::boolean IS NULL OR is_active = ${active})
    ORDER BY name ASC, version DESC
  `;

  return Response.json({
    templates: rows.map((r) =>
      serializeDasTemplate(r as Parameters<typeof serializeDasTemplate>[0])
    ),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    type?: string;
    version?: number;
    body?: Record<string, unknown>;
    handlebarsHtml?: string | null;
    isActive?: boolean;
  };

  const name = body.name?.trim() ?? '';
  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const type = body.type?.trim() ?? '';
  if (!isDasDocumentType(type)) {
    return Response.json(
      { error: 'type must be quotation, invoice, proposal, sla, nda, or other' },
      { status: 400 }
    );
  }

  const version = Number(body.version ?? 1);
  if (!Number.isInteger(version) || version < 1) {
    return Response.json({ error: 'version must be a positive integer' }, { status: 400 });
  }

  const templateBody =
    body.body && typeof body.body === 'object' ? body.body : {};
  const handlebarsHtml = body.handlebarsHtml?.trim() || null;
  const isActive = body.isActive !== false;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    INSERT INTO das_templates (
      account_id, name, type, version, body, handlebars_html, is_active
    )
    VALUES (
      ${accountId}::uuid,
      ${name},
      ${type as DasDocumentType},
      ${version},
      ${JSON.stringify(templateBody)}::jsonb,
      ${handlebarsHtml},
      ${isActive}
    )
    RETURNING
      id,
      account_id as "accountId",
      name,
      type,
      version,
      body,
      handlebars_html as "handlebarsHtml",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const template = serializeDasTemplate(
    rows[0] as Parameters<typeof serializeDasTemplate>[0]
  );

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'template',
      ${template.id}::uuid,
      'created',
      ${auth.userId}::uuid,
      ${JSON.stringify({ name, type, version })}::jsonb
    )
  `;

  return Response.json({ template }, { status: 201 });
}
