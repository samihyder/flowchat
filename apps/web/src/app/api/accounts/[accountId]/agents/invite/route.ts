import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
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

  const body = (await req.json()) as { email?: string; role?: 'administrator' | 'agent' };
  const email = body.email?.trim().toLowerCase();
  const role = body.role ?? 'agent';

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  const sql = neon(databaseUrl);

  const users = await sql`
    SELECT id, name, email FROM users WHERE LOWER(email) = ${email} LIMIT 1
  `;
  const user = users[0] as { id: string; name: string; email: string } | undefined;
  if (!user) {
    return Response.json(
      { error: 'No user found with that email. Ask them to sign up first.' },
      { status: 404 }
    );
  }

  const existing = await sql`
    SELECT user_id FROM account_users
    WHERE user_id = ${user.id}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (existing[0]) {
    return Response.json({ error: 'Agent is already a member of this account' }, { status: 409 });
  }

  await sql`
    INSERT INTO account_users (account_id, user_id, role, availability)
    VALUES (${accountId}::uuid, ${user.id}::uuid, ${role}, 'offline')
  `;

  return Response.json(
    {
      message: 'Agent added successfully',
      agent: { userId: user.id, name: user.name, email: user.email, role },
    },
    { status: 201 }
  );
}
