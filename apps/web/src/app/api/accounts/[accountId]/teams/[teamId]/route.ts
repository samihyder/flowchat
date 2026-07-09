import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; teamId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, teamId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    description?: string | null;
    isEnabled?: boolean;
    autoAssignment?: boolean;
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    UPDATE teams SET
      name = COALESCE(${body.name ?? null}, name),
      description = COALESCE(${body.description !== undefined ? body.description : null}, description),
      is_enabled = COALESCE(${body.isEnabled ?? null}, is_enabled),
      auto_assignment = COALESCE(${body.autoAssignment ?? null}, auto_assignment),
      updated_at = NOW()
    WHERE id = ${teamId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, description, is_enabled as "isEnabled", auto_assignment as "autoAssignment"
  `;

  if (!rows[0]) return Response.json({ error: 'Team not found' }, { status: 404 });
  return Response.json({ team: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, teamId } = await params;
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
  const result = await sql`
    DELETE FROM teams WHERE id = ${teamId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!result[0]) return Response.json({ error: 'Team not found' }, { status: 404 });
  return Response.json({ message: 'Team deleted successfully' });
}
