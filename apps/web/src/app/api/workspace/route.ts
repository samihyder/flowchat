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
  const rows = await sql`
    SELECT a.id, a.name, a.slug
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    JOIN accounts a ON a.id = au.account_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  const row = rows[0] as { id: string; name: string; slug: string } | undefined;
  if (!row) {
    return Response.json({ account: null });
  }

  return Response.json({
    account: { id: row.id, name: row.name, slug: row.slug },
  });
}
