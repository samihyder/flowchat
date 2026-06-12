import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; keyId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, keyId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as { enabled?: boolean; name?: string };
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const rows = await sql`
    UPDATE account_api_keys SET
      enabled = COALESCE(${body.enabled ?? null}, enabled),
      name = COALESCE(${body.name?.trim() ?? null}, name)
    WHERE id = ${keyId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, key_prefix as "keyPrefix", scopes, enabled
  `;
  if (!rows[0]) return Response.json({ error: 'API key not found' }, { status: 404 });

  return Response.json({ apiKey: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, keyId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await sql`
    DELETE FROM account_api_keys
    WHERE id = ${keyId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!result[0]) return Response.json({ error: 'API key not found' }, { status: 404 });

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'api_key.deleted',
    resourceType: 'api_key',
    resourceId: keyId,
  });

  return Response.json({ ok: true });
}
