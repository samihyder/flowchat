import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db, conversations, contacts, messages, inboxes } from '../db/index.js';
import { sessionMiddleware } from '../middleware/session.js';
import { accountMiddleware } from '../middleware/account.js';
import { insertMessage, serializeMessage } from '../lib/conversations.js';

export const conversationsRouter = new Hono();

conversationsRouter.use('*', sessionMiddleware);
conversationsRouter.use('*', accountMiddleware);

// GET /accounts/:accountId/conversations
conversationsRouter.get('/', async (c) => {
  const accountId = c.get('accountId');
  const inboxId = c.req.query('inboxId');
  const status = c.req.query('status') ?? 'open';
  const validStatuses = ['open', 'pending', 'resolved', 'snoozed'] as const;
  const statusFilter = validStatuses.includes(status as typeof validStatuses[number])
    ? (status as typeof validStatuses[number])
    : 'open';

  const conditions = [eq(conversations.accountId, accountId), eq(conversations.status, statusFilter)];
  if (inboxId) conditions.push(eq(conversations.inboxId, inboxId));

  const rows = await db
    .select({
      id: conversations.id,
      inboxId: conversations.inboxId,
      contactId: conversations.contactId,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      unreadCount: conversations.unreadCount,
      createdAt: conversations.createdAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      inboxName: inboxes.name,
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .innerJoin(inboxes, eq(conversations.inboxId, inboxes.id))
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));

  return c.json({ conversations: rows });
});

// GET /accounts/:accountId/conversations/:conversationId
conversationsRouter.get('/:conversationId', async (c) => {
  const accountId = c.get('accountId');
  const conversationId = c.req.param('conversationId');

  const [row] = await db
    .select({
      id: conversations.id,
      inboxId: conversations.inboxId,
      contactId: conversations.contactId,
      status: conversations.status,
      unreadCount: conversations.unreadCount,
      contactName: contacts.name,
      contactEmail: contacts.email,
      inboxName: inboxes.name,
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .innerJoin(inboxes, eq(conversations.inboxId, inboxes.id))
    .where(and(eq(conversations.id, conversationId), eq(conversations.accountId, accountId)))
    .limit(1);

  if (!row) return c.json({ error: 'Conversation not found' }, 404);

  // Mark as read
  await db
    .update(conversations)
    .set({ unreadCount: 0 })
    .where(eq(conversations.id, conversationId));

  return c.json({ conversation: row });
});

// GET /accounts/:accountId/conversations/:conversationId/messages
conversationsRouter.get('/:conversationId/messages', async (c) => {
  const accountId = c.get('accountId');
  const conversationId = c.req.param('conversationId');

  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.accountId, accountId)))
    .limit(1);

  if (!conv) return c.json({ error: 'Conversation not found' }, 404);

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return c.json({ messages: rows.map(serializeMessage) });
});

// POST /accounts/:accountId/conversations/:conversationId/messages
conversationsRouter.post(
  '/:conversationId/messages',
  zValidator('json', z.object({ content: z.string().min(1).max(10000) })),
  async (c) => {
    const accountId = c.get('accountId');
    const userId = c.get('userId');
    const conversationId = c.req.param('conversationId');
    const { content } = c.req.valid('json');

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.accountId, accountId)))
      .limit(1);

    if (!conv) return c.json({ error: 'Conversation not found' }, 404);

    const message = await insertMessage({
      conversationId,
      accountId,
      content,
      senderType: 'agent',
      senderId: userId,
      incrementUnread: false,
    });

    return c.json({ message: serializeMessage(message) }, 201);
  }
);

// PATCH mark conversation resolved (bonus for sprint)
conversationsRouter.patch(
  '/:conversationId',
  zValidator('json', z.object({ status: z.enum(['open', 'pending', 'resolved', 'snoozed']).optional() })),
  async (c) => {
    const accountId = c.get('accountId');
    const conversationId = c.req.param('conversationId');
    const { status } = c.req.valid('json');

    const [updated] = await db
      .update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(conversations.id, conversationId), eq(conversations.accountId, accountId)))
      .returning();

    if (!updated) return c.json({ error: 'Conversation not found' }, 404);
    return c.json({ conversation: updated });
  }
);
