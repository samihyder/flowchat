import { neon } from '@/lib/neon';
import { touchSession } from '@/lib/auth-server';
import { getBearerToken } from '@/lib/db-auth';

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const userId = await touchSession(token);
  if (!userId) {
    return Response.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  const sql = neon(databaseUrl);
  const users = await sql`
    SELECT id, name, email, avatar_url as "avatarUrl", totp_enabled_at as "totpEnabledAt",
           is_super_admin as "isSuperAdmin"
    FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  const user = users[0] as
    | {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        totpEnabledAt: string | null;
        isSuperAdmin: boolean;
      }
    | undefined;

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.isSuperAdmin) {
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        totpEnabled: !!user.totpEnabledAt,
      },
      account: null,
      isSuperAdmin: true,
    });
  }

  const memberships = await sql`
    SELECT au.account_id as "accountId", au.status,
           a.name as "accountName", a.slug
    FROM account_users au
    JOIN accounts a ON a.id = au.account_id
    WHERE au.user_id = ${userId}::uuid
    ORDER BY au.created_at ASC
  `;

  const active = memberships.find((m) => (m as { status: string }).status === 'active') as
    | { accountId: string; accountName: string; slug: string }
    | undefined;

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      totpEnabled: !!user.totpEnabledAt,
    },
    account: active
      ? { id: active.accountId, name: active.accountName, slug: active.slug }
      : null,
    isSuperAdmin: false,
  });
}
