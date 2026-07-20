import { neon } from '@/lib/neon';
import { verifyPassword, createSession } from '@/lib/auth-server';
import { getClientIp } from '@/lib/request-ip';

export async function POST(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const body = (await req.json()) as { email?: string; password?: string; rememberMe?: boolean };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const rememberMe = body.rememberMe ?? false;

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const sql = neon(databaseUrl);
  const users = await sql`
    SELECT id, name, email, password_hash as "passwordHash", totp_enabled_at as "totpEnabledAt",
           is_super_admin as "isSuperAdmin"
    FROM users WHERE LOWER(email) = ${email} LIMIT 1
  `;
  const user = users[0] as {
    id: string;
    name: string;
    email: string;
    passwordHash: string | null;
    totpEnabledAt: string | null;
    isSuperAdmin: boolean;
  } | undefined;

  if (!user?.passwordHash) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (user.totpEnabledAt) {
    return Response.json({ requiresTwoFactor: true, userId: user.id });
  }

  if (user.isSuperAdmin) {
    const { token, expiresAt } = await createSession(user.id, rememberMe, {
      userAgent: req.headers.get('user-agent'),
      ipAddress: getClientIp(req),
    });
    return Response.json({
      user: { id: user.id, name: user.name, email: user.email },
      account: null,
      isSuperAdmin: true,
      token,
      expiresAt,
    });
  }

  const memberships = await sql`
    SELECT au.account_id as "accountId", au.role, au.status,
           a.name as "accountName", a.slug
    FROM account_users au
    JOIN accounts a ON a.id = au.account_id
    WHERE au.user_id = ${user.id}::uuid
    ORDER BY au.created_at ASC
  `;

  const active = memberships.find((m) => (m as { status: string }).status === 'active');
  const pending = memberships.filter((m) => (m as { status: string }).status === 'pending');

  if (!active && pending.length > 0) {
    return Response.json({
      pendingApproval: true,
      accountName: (pending[0] as { accountName: string }).accountName,
    });
  }

  if (!active) {
    return Response.json({ error: 'No active workspace access. Contact your administrator.' }, { status: 403 });
  }

  const { token, expiresAt } = await createSession(user.id, rememberMe, {
    userAgent: req.headers.get('user-agent'),
    ipAddress: getClientIp(req),
  });

  return Response.json({
    user: { id: user.id, name: user.name, email: user.email },
    account: {
      id: (active as { accountId: string }).accountId,
      name: (active as { accountName: string }).accountName,
      slug: (active as { slug: string }).slug,
    },
    isSuperAdmin: false,
    token,
    expiresAt,
  });
}
