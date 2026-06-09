import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

/** Verify bearer token and account membership. */
export async function authorizeAccount(
  token: string,
  accountId: string
): Promise<{ userId: string; role: string } | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT au.role, s.user_id
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
      AND au.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as { user_id: string; role: string } | undefined;
  if (!row) return null;
  return { userId: row.user_id, role: row.role };
}

export function getBearerToken(req: Request) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
}
