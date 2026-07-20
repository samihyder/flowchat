import { neon } from '@/lib/neon';
import { touchSession } from '@/lib/auth-server';
import { getBearerToken } from '@/lib/db-auth';

export async function GET(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await touchSession(token);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT
      id, user_agent as "userAgent", ip_address as "ipAddress",
      last_seen_at as "lastSeenAt", created_at as "createdAt",
      remember_me as "rememberMe", (token = ${token}) as "isCurrent"
    FROM sessions
    WHERE user_id = ${userId}::uuid AND expires_at > NOW()
    ORDER BY last_seen_at DESC
  `;

  return Response.json({ sessions: rows });
}

export async function DELETE(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await touchSession(token);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sessionId = new URL(req.url).searchParams.get('id');
  if (!sessionId) return Response.json({ error: 'id query param is required' }, { status: 400 });

  const sql = neon(databaseUrl);
  await sql`
    DELETE FROM sessions WHERE id = ${sessionId}::uuid AND user_id = ${userId}::uuid
  `;

  return Response.json({ ok: true });
}
