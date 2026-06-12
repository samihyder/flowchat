import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { generateApiKey } from '@/lib/api-keys';
import { writeAuditLog } from '@/lib/audit-log';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, name, key_prefix as "keyPrefix", scopes, enabled,
           created_at as "createdAt", last_used_at as "lastUsedAt"
    FROM account_api_keys
    WHERE account_id = ${accountId}::uuid
    ORDER BY created_at DESC
  `;

  return Response.json({ apiKeys: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string; scopes?: string[] };
  const name = body.name?.trim() || 'Integration key';
  const scopes = body.scopes?.length
    ? body.scopes.filter((s) => s === 'contacts:read' || s === 'contacts:write')
    : ['contacts:read', 'contacts:write'];

  const { key, hash, prefix } = generateApiKey();
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const rows = await sql`
    INSERT INTO account_api_keys (account_id, name, key_hash, key_prefix, scopes, created_by)
    VALUES (
      ${accountId}::uuid,
      ${name},
      ${hash},
      ${prefix},
      ${JSON.stringify(scopes)}::jsonb,
      ${auth.userId}::uuid
    )
    RETURNING id, name, key_prefix as "keyPrefix", scopes, enabled, created_at as "createdAt"
  `;

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'api_key.created',
    resourceType: 'api_key',
    resourceId: (rows[0] as { id: string }).id,
  });

  return Response.json({ apiKey: rows[0], secret: key }, { status: 201 });
}
