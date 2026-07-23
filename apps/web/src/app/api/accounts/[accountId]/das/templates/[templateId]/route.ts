import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  isDasDocumentType,
  serializeDasTemplate,
  type DasDocumentType,
} from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; templateId: string }> };

async function fetchTemplate(sql: AppSql, accountId: string, templateId: string) {
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
    WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, templateId } = await params;
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

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await fetchTemplate(sql, accountId, templateId);
  if (!existing) {
    return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  const current = serializeDasTemplate(
    existing as Parameters<typeof serializeDasTemplate>[0]
  );

  let nextName = current.name;
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return Response.json({ error: 'name cannot be empty' }, { status: 400 });
    }
    nextName = trimmed;
  }

  let nextType: DasDocumentType = current.type;
  if (body.type !== undefined) {
    if (!isDasDocumentType(body.type)) {
      return Response.json(
        { error: 'type must be quotation, invoice, proposal, sla, nda, or other' },
        { status: 400 }
      );
    }
    nextType = body.type;
  }

  let nextVersion = current.version;
  if (body.version !== undefined) {
    const version = Number(body.version);
    if (!Number.isInteger(version) || version < 1) {
      return Response.json({ error: 'version must be a positive integer' }, { status: 400 });
    }
    nextVersion = version;
  }

  const nextBody =
    body.body !== undefined
      ? body.body && typeof body.body === 'object'
        ? body.body
        : {}
      : current.body;
  const nextHandlebarsHtml =
    body.handlebarsHtml !== undefined
      ? body.handlebarsHtml?.trim() || null
      : current.handlebarsHtml;
  const nextIsActive =
    body.isActive !== undefined ? Boolean(body.isActive) : current.isActive;

  await sql`
    UPDATE das_templates SET
      name = ${nextName},
      type = ${nextType},
      version = ${nextVersion},
      body = ${JSON.stringify(nextBody)}::jsonb,
      handlebars_html = ${nextHandlebarsHtml},
      is_active = ${nextIsActive},
      updated_at = NOW()
    WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'template',
      ${templateId}::uuid,
      'updated',
      ${auth.userId}::uuid,
      ${JSON.stringify({ name: nextName, type: nextType, version: nextVersion })}::jsonb
    )
  `;

  const row = await fetchTemplate(sql, accountId, templateId);
  return Response.json({
    template: serializeDasTemplate(
      row as Parameters<typeof serializeDasTemplate>[0]
    ),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, templateId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM das_templates
    WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'template',
      ${templateId}::uuid,
      'deleted',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ ok: true });
}
