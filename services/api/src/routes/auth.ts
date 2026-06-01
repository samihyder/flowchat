import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db, users, accounts, accountUsers } from '../db/index.js';
import { signUpSchema, signInSchema } from '../lib/schemas.js';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
} from '../lib/auth.js';
import { sessionMiddleware } from '../middleware/session.js';

export const authRouter = new Hono();

// POST /auth/sign-up
authRouter.post('/sign-up', zValidator('json', signUpSchema), async (c) => {
  const { name, email, password, accountName } = c.req.valid('json');

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const passwordHash = await hashPassword(password);

  // Create user + account + account_user in a transaction
  const slug = accountName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  if (!user) return c.json({ error: 'Failed to create user' }, 500);

  const [account] = await db
    .insert(accounts)
    .values({ name: accountName, slug: `${slug}-${Date.now()}` })
    .returning();
  if (!account) return c.json({ error: 'Failed to create account' }, 500);

  await db.insert(accountUsers).values({
    userId: user.id,
    accountId: account.id,
    role: 'administrator',
    availability: 'online',
  });

  const { token, expiresAt } = await createSession(user.id);

  return c.json(
    {
      user: { id: user.id, name: user.name, email: user.email },
      account: { id: account.id, name: account.name, slug: account.slug },
      token,
      expiresAt,
    },
    201
  );
});

// POST /auth/sign-in
authRouter.post('/sign-in', zValidator('json', signInSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const { token, expiresAt } = await createSession(user.id);

  return c.json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
    expiresAt,
  });
});

// POST /auth/sign-out
authRouter.post('/sign-out', sessionMiddleware, async (c) => {
  const token = c.get('sessionToken');
  await deleteSession(token);
  return c.json({ success: true });
});

// GET /auth/me
authRouter.get('/me', sessionMiddleware, async (c) => {
  const userId = c.get('userId');
  const [user] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user });
});
