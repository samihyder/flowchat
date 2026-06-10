import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; teamId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, teamId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const team = await sql`
    SELECT id FROM teams WHERE id = ${teamId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!team[0]) return Response.json({ error: 'Team not found' }, { status: 404 });

  const rows = await sql`
    SELECT tm.user_id as "userId", u.name, u.email, u.avatar_url as "avatarUrl",
           au.role, au.availability
    FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    INNER JOIN account_users au ON au.user_id = tm.user_id AND au.account_id = ${accountId}::uuid
    WHERE tm.team_id = ${teamId}::uuid
  `;

  return Response.json({ members: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, teamId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as { userId?: string };
  if (!body.userId) return Response.json({ error: 'userId is required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const team = await sql`
    SELECT id FROM teams WHERE id = ${teamId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!team[0]) return Response.json({ error: 'Team not found' }, { status: 404 });

  const member = await sql`
    SELECT user_id FROM account_users
    WHERE user_id = ${body.userId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!member[0]) {
    return Response.json({ error: 'User is not an agent in this account' }, { status: 404 });
  }

  const existing = await sql`
    SELECT user_id FROM team_members
    WHERE team_id = ${teamId}::uuid AND user_id = ${body.userId}::uuid LIMIT 1
  `;
  if (existing[0]) {
    return Response.json({ error: 'Agent is already in this team' }, { status: 409 });
  }

  await sql`
    INSERT INTO team_members (team_id, user_id) VALUES (${teamId}::uuid, ${body.userId}::uuid)
  `;

  return Response.json({ message: 'Agent added to team' }, { status: 201 });
}
