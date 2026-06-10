import { neon } from '@neondatabase/serverless';
import { hashPassword, createSession } from '@/lib/auth-server';
import { isWorkEmail, WORK_EMAIL_MESSAGE } from '@/lib/email-domain';

export async function POST(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    accountName?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const accountName = body.accountName?.trim();

  if (!name || !email || !password || !accountName) {
    return Response.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!isWorkEmail(email)) {
    return Response.json({ error: WORK_EMAIL_MESSAGE }, { status: 400 });
  }

  const sql = neon(databaseUrl);
  const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${email} LIMIT 1`;
  if (existing[0]) {
    return Response.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const slug = accountName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  const users = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name}, ${email}, ${passwordHash})
    RETURNING id, name, email
  `;
  const user = users[0] as { id: string; name: string; email: string } | undefined;
  if (!user) return Response.json({ error: 'Failed to create user' }, { status: 500 });

  const accounts = await sql`
    INSERT INTO accounts (name, slug)
    VALUES (${accountName}, ${`${slug}-${Date.now()}`})
    RETURNING id, name, slug
  `;
  const account = accounts[0] as { id: string; name: string; slug: string } | undefined;
  if (!account) return Response.json({ error: 'Failed to create workspace' }, { status: 500 });

  await sql`
    INSERT INTO account_users (account_id, user_id, role, availability, status)
    VALUES (${account.id}::uuid, ${user.id}::uuid, 'administrator', 'online', 'active')
  `;

  const { token, expiresAt } = await createSession(user.id);

  return Response.json(
    {
      user: { id: user.id, name: user.name, email: user.email },
      account: { id: account.id, name: account.name, slug: account.slug },
      token,
      expiresAt,
    },
    { status: 201 }
  );
}
