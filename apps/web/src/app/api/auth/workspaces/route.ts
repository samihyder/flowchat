import { neon } from '@neondatabase/serverless';
import { touchSession } from '@/lib/auth-server';
import { getBearerToken } from '@/lib/db-auth';

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const userId = await touchSession(token);
  if (!userId) return Response.json({ error: 'Session expired or invalid' }, { status: 401 });

  const sql = neon(databaseUrl);
  const users = await sql`SELECT is_super_admin as "isSuperAdmin" FROM users WHERE id = ${userId}::uuid LIMIT 1`;
  const user = users[0] as { isSuperAdmin: boolean } | undefined;
  if (!user?.isSuperAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await sql`
    SELECT a.id, a.name, a.slug, a.status, a.logo_url as "logoUrl", a.created_at as "createdAt",
           (SELECT COUNT(*)::int FROM account_users au WHERE au.account_id = a.id) as "userCount",
           (SELECT COUNT(*)::int FROM contacts c WHERE c.account_id = a.id) as "contactCount",
           (SELECT COUNT(*)::int FROM inboxes i WHERE i.account_id = a.id) as "inboxCount"
    FROM accounts a
    ORDER BY a.created_at DESC
  `;

  return Response.json({
    workspaces: (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt as Date).toISOString(),
    })),
  });
}
