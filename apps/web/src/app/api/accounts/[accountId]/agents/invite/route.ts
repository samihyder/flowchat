import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { createId } from '@paralleldrive/cuid2';
import { sendAgentInviteEmail } from '@/lib/email';
import { isInviteEmailAllowed } from '@/lib/invite-domain';
import { parseAccountSettings } from '@/lib/account-settings';
import { isWorkEmail, WORK_EMAIL_MESSAGE } from '@/lib/email-domain';

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
  if (!isWorkEmail(email)) {
    return Response.json({ error: WORK_EMAIL_MESSAGE }, { status: 400 });
  }

  const sql = neon(databaseUrl);

  const accountRows = await sql`SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const settings = parseAccountSettings((accountRows[0] as { settings: unknown } | undefined)?.settings);
  const allowed = settings.allowedInviteDomains ?? [];
  if (allowed.length > 0 && !isInviteEmailAllowed(email, allowed)) {
    return Response.json(
      { error: `Invites are restricted to: ${allowed.map((d) => `@${d}`).join(', ')}` },
      { status: 400 }
    );
  }

  const users = await sql`
    SELECT id, name, email FROM users WHERE LOWER(email) = ${email} LIMIT 1
  `;
  const user = users[0] as { id: string; name: string; email: string } | undefined;

  if (user) {
    const existing = await sql`
      SELECT user_id, status FROM account_users
      WHERE user_id = ${user.id}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    if (existing[0]) {
      return Response.json({ error: 'User is already linked to this workspace' }, { status: 409 });
    }

    await sql`
      INSERT INTO account_users (account_id, user_id, role, availability, status)
      VALUES (${accountId}::uuid, ${user.id}::uuid, ${role}, 'offline', 'pending')
    `;

    return Response.json(
      {
        message: 'Agent added with pending approval. They must wait for you to approve access.',
        agent: { userId: user.id, name: user.name, email: user.email, role, membershipStatus: 'pending' },
      },
      { status: 201 }
    );
  }

  const inviteToken = createId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO agent_invites (account_id, email, role, token, invited_by, expires_at)
    VALUES (
      ${accountId}::uuid,
      ${email},
      ${role},
      ${inviteToken},
      ${auth.userId}::uuid,
      ${expiresAt.toISOString()}::timestamptz
    )
  `;

  const origin =
    process.env.WEB_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3100');
  const inviteUrl = `${origin.replace(/\/$/, '')}/accept-invite?token=${inviteToken}`;

  const accounts = await sql`SELECT name FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const workspaceName = (accounts[0] as { name: string } | undefined)?.name ?? 'your workspace';
  const emailed = await sendAgentInviteEmail(email, inviteUrl, workspaceName);

  return Response.json(
    {
      message: emailed
        ? 'Invite email sent. The agent can also use the link below.'
        : 'Invite created. Share this link with the agent (email not configured).',
      inviteUrl,
      agent: { email, role, membershipStatus: 'invited' },
    },
    { status: 201 }
  );
}
