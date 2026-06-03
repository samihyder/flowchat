import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, accountUsers, users } from '../db/index.js';
import { sessionMiddleware } from '../middleware/session.js';
import { accountMiddleware, adminMiddleware } from '../middleware/account.js';

export const agentsRouter = new Hono();

agentsRouter.use('*', sessionMiddleware);
agentsRouter.use('*', accountMiddleware);

// List all agents in an account
agentsRouter.get('/', async (c) => {
  const accountId = c.get('accountId');

  const agents = await db
    .select({
      userId: accountUsers.userId,
      role: accountUsers.role,
      availability: accountUsers.availability,
      displayName: accountUsers.displayName,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      createdAt: accountUsers.createdAt,
    })
    .from(accountUsers)
    .innerJoin(users, eq(accountUsers.userId, users.id))
    .where(eq(accountUsers.accountId, accountId));

  return c.json({ agents });
});

// Invite an existing user as agent
agentsRouter.post(
  '/invite',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      role: z.enum(['administrator', 'agent']).default('agent'),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const { email, role } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return c.json({ error: 'No user found with that email. Ask them to sign up first.' }, 404);
    }

    const [existing] = await db
      .select()
      .from(accountUsers)
      .where(and(eq(accountUsers.userId, user.id), eq(accountUsers.accountId, accountId)))
      .limit(1);

    if (existing) return c.json({ error: 'Agent is already a member of this account' }, 409);

    await db.insert(accountUsers).values({
      userId: user.id,
      accountId,
      role,
      availability: 'offline',
    });

    return c.json(
      {
        message: 'Agent added successfully',
        agent: { userId: user.id, name: user.name, email: user.email, role },
      },
      201
    );
  }
);

// Update agent role or display name
agentsRouter.patch(
  '/:userId',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      role: z.enum(['administrator', 'agent']).optional(),
      displayName: z.string().max(255).nullable().optional(),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const targetUserId = c.req.param('userId');
    const data = c.req.valid('json');

    const [membership] = await db
      .select()
      .from(accountUsers)
      .where(and(eq(accountUsers.userId, targetUserId), eq(accountUsers.accountId, accountId)))
      .limit(1);

    if (!membership) return c.json({ error: 'Agent not found' }, 404);

    const [updated] = await db
      .update(accountUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(accountUsers.userId, targetUserId), eq(accountUsers.accountId, accountId)))
      .returning();

    return c.json({ agent: updated });
  }
);

// Update own availability
agentsRouter.patch(
  '/me/availability',
  zValidator('json', z.object({ availability: z.enum(['online', 'busy', 'offline']) })),
  async (c) => {
    const accountId = c.get('accountId');
    const userId = c.get('userId');
    const { availability } = c.req.valid('json');

    await db
      .update(accountUsers)
      .set({ availability, updatedAt: new Date() })
      .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId)));

    return c.json({ availability });
  }
);

// Remove agent from account (deactivate)
agentsRouter.delete('/:userId', adminMiddleware, async (c) => {
  const accountId = c.get('accountId');
  const targetUserId = c.req.param('userId');

  if (targetUserId === c.get('userId')) {
    return c.json({ error: 'Cannot remove yourself from the account' }, 400);
  }

  const [membership] = await db
    .select()
    .from(accountUsers)
    .where(and(eq(accountUsers.userId, targetUserId), eq(accountUsers.accountId, accountId)))
    .limit(1);

  if (!membership) return c.json({ error: 'Agent not found' }, 404);

  await db
    .delete(accountUsers)
    .where(and(eq(accountUsers.userId, targetUserId), eq(accountUsers.accountId, accountId)));

  await db.update(users).set({ isActive: false }).where(eq(users.id, targetUserId));

  return c.json({ message: 'Agent removed successfully' });
});
