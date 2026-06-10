import { neon } from '@neondatabase/serverless';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT i.email, i.role, i.expires_at as "expiresAt", i.accepted_at as "acceptedAt",
           a.name as "accountName"
    FROM agent_invites i
    JOIN accounts a ON a.id = i.account_id
    WHERE i.token = ${token}
    LIMIT 1
  `;
  const invite = rows[0] as {
    email: string;
    role: string;
    expiresAt: string;
    acceptedAt: string | null;
    accountName: string;
  } | undefined;

  if (!invite) return Response.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.acceptedAt) return Response.json({ error: 'Invite already used' }, { status: 410 });
  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ error: 'Invite has expired' }, { status: 410 });
  }

  return Response.json({
    invite: {
      email: invite.email,
      role: invite.role,
      accountName: invite.accountName,
    },
  });
}
