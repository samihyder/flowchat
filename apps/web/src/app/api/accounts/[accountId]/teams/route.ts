import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT t.id, t.name, t.description, t.is_enabled as "isEnabled", t.auto_assignment as "autoAssignment",
           (SELECT COUNT(*)::int FROM conversations c
            WHERE c.team_id = t.id AND c.created_at >= CURRENT_DATE) as "conversationsToday",
           (SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = t.id) as "memberCount"
    FROM teams t WHERE t.account_id = ${accountId}::uuid
    ORDER BY t.created_at ASC
  `;

  return Response.json({ teams: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string; description?: string };
  if (!body.name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    INSERT INTO teams (account_id, name, description)
    VALUES (${accountId}::uuid, ${body.name.trim()}, ${body.description ?? null})
    RETURNING id, name, description, is_enabled as "isEnabled", auto_assignment as "autoAssignment"
  `;

  return Response.json({ team: rows[0] }, { status: 201 });
}
