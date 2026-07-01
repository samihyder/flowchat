import { neon } from '@neondatabase/serverless';
import { touchSession } from '@/lib/auth-server';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

/** Verify bearer token and account membership. */
export async function authorizeAccount(
  token: string,
  accountId: string
): Promise<{ userId: string; role: string; status: string } | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT au.role, au.status, s.user_id
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
      AND au.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as { user_id: string; role: string; status: string } | undefined;
  if (!row) return null;
  if (row.status !== 'active') return null;
  await touchSession(token);
  return { userId: row.user_id, role: row.role, status: row.status };
}

export function getBearerToken(req: Request) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
}
