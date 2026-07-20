import { neon } from '@/lib/neon';
import { authorizeApiKey, getIntegrationApiKey, hasScope, type ApiKeyAuth } from '@/lib/api-keys';
import type { AppSql } from '@/lib/db-sql';

export async function requireIntegrationAuth(
  req: Request,
  scope: 'contacts:read' | 'contacts:write'
): Promise<{ ok: true; auth: ApiKeyAuth; sql: AppSql } | { ok: false; response: Response }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      ok: false,
      response: Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 }),
    };
  }

  const rawKey = getIntegrationApiKey(req);
  if (!rawKey) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Missing API key. Use Authorization: Bearer fc_live_… or X-FlowChat-Api-Key' },
        { status: 401 }
      ),
    };
  }

  const sql = neon(databaseUrl) as AppSql;
  const auth = await authorizeApiKey(sql, rawKey);
  if (!auth) {
    return { ok: false, response: Response.json({ error: 'Invalid API key' }, { status: 401 }) };
  }
  if (!hasScope(auth, scope)) {
    return { ok: false, response: Response.json({ error: 'Insufficient scope' }, { status: 403 }) };
  }

  return { ok: true, auth, sql };
}
