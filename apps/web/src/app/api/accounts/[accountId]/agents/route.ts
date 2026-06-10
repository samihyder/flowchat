import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT
      au.user_id as "userId",
      au.role,
      au.availability,
      au.display_name as "displayName",
      u.name,
      u.email,
      u.avatar_url as "avatarUrl",
      u.is_active as "isActive"
    FROM account_users au
    INNER JOIN users u ON u.id = au.user_id
    WHERE au.account_id = ${accountId}::uuid
    ORDER BY au.created_at ASC
  `;

  return Response.json({ agents: rows });
}
