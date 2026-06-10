import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, inboxes, inboxMembers, accountUsers } from '../db/index.js';
import { sessionMiddleware } from '../middleware/session.js';
import { accountMiddleware, adminMiddleware } from '../middleware/account.js';

export const inboxesRouter = new Hono();

inboxesRouter.use('*', sessionMiddleware);
inboxesRouter.use('*', accountMiddleware);

// List all inboxes in an account
inboxesRouter.get('/', async (c) => {
  const accountId = c.get('accountId');

  const rows = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.accountId, accountId), eq(inboxes.isEnabled, true)));

  return c.json({ inboxes: rows });
});

// Create an inbox
inboxesRouter.post(
  '/',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(255),
      channelType: z
        .enum(['web_widget', 'email', 'whatsapp', 'facebook', 'instagram', 'telegram', 'sms', 'api'])
        .default('web_widget'),
      greetingMessage: z.string().max(1000).optional(),
      welcomeTitle: z.string().max(255).optional(),
      welcomeTagline: z.string().max(255).optional(),
      widgetColor: z.string().max(20).optional(),
      widgetIcon: z.string().max(32).optional(),
      widgetTheme: z.record(z.string()).optional(),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const data = c.req.valid('json');

    const [inbox] = await db.insert(inboxes).values({ accountId, ...data }).returning();

    return c.json({ inbox }, 201);
  }
);

// Update an inbox
inboxesRouter.patch(
  '/:inboxId',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(255).optional(),
      greetingMessage: z.string().max(1000).nullable().optional(),
      welcomeTitle: z.string().max(255).nullable().optional(),
      welcomeTagline: z.string().max(255).nullable().optional(),
      widgetColor: z.string().max(20).optional(),
      widgetIcon: z.string().max(32).optional(),
      widgetTheme: z.record(z.string()).optional(),
      isEnabled: z.boolean().optional(),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const inboxId = c.req.param('inboxId');
    const data = c.req.valid('json');

    const [existing] = await db
      .select()
      .from(inboxes)
      .where(and(eq(inboxes.id, inboxId), eq(inboxes.accountId, accountId)))
      .limit(1);

    if (!existing) return c.json({ error: 'Inbox not found' }, 404);

    const [updated] = await db
      .update(inboxes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(inboxes.id, inboxId), eq(inboxes.accountId, accountId)))
      .returning();

    return c.json({ inbox: updated });
  }
);

// Delete an inbox
inboxesRouter.delete('/:inboxId', adminMiddleware, async (c) => {
  const accountId = c.get('accountId');
  const inboxId = c.req.param('inboxId');

  const [existing] = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId), eq(inboxes.accountId, accountId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Inbox not found' }, 404);

  await db.delete(inboxes).where(eq(inboxes.id, inboxId));

  return c.json({ message: 'Inbox deleted' });
});

// List inbox members
inboxesRouter.get('/:inboxId/members', async (c) => {
  const accountId = c.get('accountId');
  const inboxId = c.req.param('inboxId');

  const members = await db
    .select({
      userId: inboxMembers.userId,
      role: accountUsers.role,
      availability: accountUsers.availability,
    })
    .from(inboxMembers)
    .innerJoin(
      accountUsers,
      and(eq(accountUsers.userId, inboxMembers.userId), eq(accountUsers.accountId, accountId))
    )
    .where(eq(inboxMembers.inboxId, inboxId));

  return c.json({ members });
});

// Add agent to inbox
inboxesRouter.post(
  '/:inboxId/members',
  adminMiddleware,
  zValidator('json', z.object({ userId: z.string().uuid() })),
  async (c) => {
    const accountId = c.get('accountId');
    const inboxId = c.req.param('inboxId');
    const { userId } = c.req.valid('json');

    const [membership] = await db
      .select()
      .from(accountUsers)
      .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId)))
      .limit(1);

    if (!membership) return c.json({ error: 'User is not an agent in this account' }, 404);

    await db.insert(inboxMembers).values({ inboxId, userId }).onConflictDoNothing();

    return c.json({ message: 'Agent added to inbox' }, 201);
  }
);
