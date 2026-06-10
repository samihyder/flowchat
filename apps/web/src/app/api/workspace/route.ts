import { neon } from '@neondatabase/serverless';

/** Resolve workspace from session when Railway API is on a stale build. */
export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  const active = await sql`
    SELECT a.id, a.name, a.slug, au.role, au.status
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    JOIN accounts a ON a.id = au.account_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
      AND au.status = 'active'
    ORDER BY au.created_at ASC
    LIMIT 1
  `;

  const row = active[0] as { id: string; name: string; slug: string } | undefined;
  if (row) {
    return Response.json({
      account: { id: row.id, name: row.name, slug: row.slug },
    });
  }

  const pending = await sql`
    SELECT a.name as "accountName"
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    JOIN accounts a ON a.id = au.account_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
      AND au.status = 'pending'
    LIMIT 1
  `;

  if (pending[0]) {
    return Response.json({
      account: null,
      pendingApproval: true,
      accountName: (pending[0] as { accountName: string }).accountName,
    });
  }

  return Response.json({ account: null });
}
