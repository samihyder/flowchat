import { neon } from '@neondatabase/serverless';
import { touchSession } from '@/lib/auth-server';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

/** Verify bearer token and account membership. Super admins bypass membership for any real account. */
export async function authorizeAccount(
  token: string,
  accountId: string
): Promise<{ userId: string; role: string; status: string; isSuperAdmin: boolean } | null> {
  const sql = getSql();

  const sessionRows = await sql`
    SELECT s.user_id as "userId", u.is_super_admin as "isSuperAdmin"
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;
  const session = sessionRows[0] as { userId: string; isSuperAdmin: boolean } | undefined;
  if (!session) return null;

  if (session.isSuperAdmin) {
    const accountRows = await sql`SELECT id FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
    if (!accountRows[0]) return null;
    await touchSession(token);
    return { userId: session.userId, role: 'administrator', status: 'active', isSuperAdmin: true };
  }

  const rows = await sql`
    SELECT au.role, au.status
    FROM account_users au
    WHERE au.user_id = ${session.userId}::uuid AND au.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as { role: string; status: string } | undefined;
  if (!row) return null;
  if (row.status !== 'active') return null;
  await touchSession(token);
  return { userId: session.userId, role: row.role, status: row.status, isSuperAdmin: false };
}

/** Verify bearer token belongs to a platform super admin. Returns userId or null. */
export async function authorizeSuperAdmin(token: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT s.user_id as "userId", u.is_super_admin as "isSuperAdmin"
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0] as { userId: string; isSuperAdmin: boolean } | undefined;
  if (!row?.isSuperAdmin) return null;
  await touchSession(token);
  return row.userId;
}

export function getBearerToken(req: Request) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
}
