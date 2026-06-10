import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; teamId: string; userId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, teamId, userId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const team = await sql`
    SELECT id FROM teams WHERE id = ${teamId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!team[0]) return Response.json({ error: 'Team not found' }, { status: 404 });

  await sql`
    DELETE FROM team_members
    WHERE team_id = ${teamId}::uuid AND user_id = ${userId}::uuid
  `;

  return Response.json({ message: 'Agent removed from team' });
}
