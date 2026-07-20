import { neon } from '@/lib/neon';
import { hashPassword } from '@/lib/auth-server';

export async function POST(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const body = (await req.json()) as { token?: string; name?: string; password?: string };
  const token = body.token?.trim();
  const name = body.name?.trim();
  const password = body.password;

  if (!token || !name || !password) {
    return Response.json({ error: 'Token, name, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const sql = neon(databaseUrl);
  const invites = await sql`
    SELECT id, account_id as "accountId", email, role, expires_at as "expiresAt", accepted_at as "acceptedAt"
    FROM agent_invites WHERE token = ${token} LIMIT 1
  `;
  const invite = invites[0] as {
    id: string;
    accountId: string;
    email: string;
    role: string;
    expiresAt: string;
    acceptedAt: string | null;
  } | undefined;

  if (!invite) return Response.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.acceptedAt) return Response.json({ error: 'Invite already used' }, { status: 410 });
  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: 'Invite has expired' }, { status: 410 });
  }

  let userId: string;
  const existing = await sql`
    SELECT id FROM users WHERE LOWER(email) = ${invite.email.toLowerCase()} LIMIT 1
  `;

  if (existing[0]) {
    userId = (existing[0] as { id: string }).id;
  } else {
    const passwordHash = await hashPassword(password);
    const created = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${invite.email.toLowerCase()}, ${passwordHash})
      RETURNING id
    `;
    if (!created[0]) return Response.json({ error: 'Failed to create user' }, { status: 500 });
    userId = (created[0] as { id: string }).id;
  }

  const member = await sql`
    SELECT user_id FROM account_users
    WHERE account_id = ${invite.accountId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `;
  if (!member[0]) {
    await sql`
      INSERT INTO account_users (account_id, user_id, role, availability, status)
      VALUES (${invite.accountId}::uuid, ${userId}::uuid, ${invite.role}, 'offline', 'pending')
    `;
  }

  await sql`
    UPDATE agent_invites SET accepted_at = NOW() WHERE id = ${invite.id}::uuid
  `;

  return Response.json({
    message: 'Account created. An administrator must approve your access before you can use the dashboard.',
    pendingApproval: true,
  });
}
