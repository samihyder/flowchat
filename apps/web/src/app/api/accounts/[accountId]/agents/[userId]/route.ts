import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; userId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, userId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const body = (await req.json()) as {
    role?: 'administrator' | 'agent';
    displayName?: string | null;
  };

  const sql = neon(databaseUrl);
  const existing = await sql`
    SELECT user_id FROM account_users
    WHERE user_id = ${userId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Agent not found' }, { status: 404 });

  const rows = await sql`
    UPDATE account_users SET
      role = COALESCE(${body.role ?? null}, role),
      display_name = COALESCE(${body.displayName !== undefined ? body.displayName : null}, display_name),
      updated_at = NOW()
    WHERE user_id = ${userId}::uuid AND account_id = ${accountId}::uuid
    RETURNING user_id as "userId", role, availability, display_name as "displayName"
  `;

  return Response.json({ agent: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, userId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  if (auth.userId === userId) {
    return Response.json({ error: 'Cannot remove yourself from the account' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  const existing = await sql`
    SELECT user_id FROM account_users
    WHERE user_id = ${userId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Agent not found' }, { status: 404 });

  await sql`
    DELETE FROM account_users
    WHERE user_id = ${userId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`
    UPDATE users SET is_active = false, updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  return Response.json({ message: 'Agent removed successfully' });
}
