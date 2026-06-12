import { createHash, randomBytes } from 'node:crypto';
import type { AppSql } from '@/lib/db-sql';

export type ApiKeyScope = 'contacts:read' | 'contacts:write';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString('hex');
  const key = `fc_live_${secret}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 16) };
}

export type ApiKeyAuth = {
  keyId: string;
  accountId: string;
  scopes: ApiKeyScope[];
};

export async function authorizeApiKey(sql: AppSql, rawKey: string | null): Promise<ApiKeyAuth | null> {
  if (!rawKey?.startsWith('fc_live_')) return null;

  const hash = hashApiKey(rawKey);
  const rows = await sql`
    SELECT id, account_id as "accountId", scopes
    FROM account_api_keys
    WHERE key_hash = ${hash} AND enabled = true
    LIMIT 1
  `;
  const row = rows[0] as { id: string; accountId: string; scopes: string[] } | undefined;
  if (!row) return null;

  void sql`UPDATE account_api_keys SET last_used_at = NOW() WHERE id = ${row.id}::uuid`;

  const scopes = (Array.isArray(row.scopes) ? row.scopes : []).filter(
    (s): s is ApiKeyScope => s === 'contacts:read' || s === 'contacts:write'
  );

  return { keyId: row.id, accountId: row.accountId, scopes };
}

export function getIntegrationApiKey(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return req.headers.get('X-FlowChat-Api-Key')?.trim() ?? null;
}

export function hasScope(auth: ApiKeyAuth, scope: ApiKeyScope): boolean {
  return auth.scopes.includes(scope);
}
