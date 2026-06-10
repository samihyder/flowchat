import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import {
  db,
  inboxes,
  contacts,
  contactInboxes,
  conversations,
  messages,
} from '../db/index.js';
import { insertMessage, serializeMessage } from '../lib/conversations.js';

export const publicWidgetRouter = new Hono();

publicWidgetRouter.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Visitor-Token'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
);

// GET /public/inboxes/:inboxId/widget-config
publicWidgetRouter.get('/inboxes/:inboxId/widget-config', async (c) => {
  const inboxId = c.req.param('inboxId');

  const [inbox] = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId), eq(inboxes.isEnabled, true)))
    .limit(1);

  if (!inbox) return c.json({ error: 'Inbox not found' }, 404);

  const primary = inbox.widgetColor ?? '#6366F1';
  const defaultTheme = {
    launcherBg: primary,
    launcherIcon: '#ffffff',
    headerBg: primary,
    headerTitle: '#ffffff',
    headerSubtitle: '#ffffff',
    panelBg: '#ffffff',
    panelBorder: '#e5e7eb',
    messagesBg: '#f9fafb',
    agentBubbleBg: '#ffffff',
    agentBubbleText: '#111827',
    visitorBubbleBg: primary,
    visitorBubbleText: '#ffffff',
    systemText: '#6b7280',
    labelText: '#374151',
    inputBg: '#ffffff',
    inputText: '#111827',
    inputBorder: '#d1d5db',
    inputPlaceholder: '#9ca3af',
    composerBg: '#ffffff',
    buttonBg: primary,
    buttonText: '#ffffff',
  };

  return c.json({
    inbox: {
      id: inbox.id,
      name: inbox.name,
      greetingMessage: inbox.greetingMessage,
      welcomeTitle: inbox.welcomeTitle ?? 'Hi there!',
      welcomeTagline: inbox.welcomeTagline ?? 'We typically reply in a few minutes',
      widgetColor: primary,
      widgetIcon: inbox.widgetIcon ?? 'chat',
      widgetTheme: { ...defaultTheme, ...(inbox.widgetTheme as Record<string, string> | null) },
    },
  });
});

// POST /public/inboxes/:inboxId/sessions — start or resume visitor session
publicWidgetRouter.post(
  '/inboxes/:inboxId/sessions',
  zValidator(
    'json',
    z.object({
      sourceId: z.string().min(8).max(255),
      name: z.string().min(1).max(255),
      email: z.string().email().optional().or(z.literal('')),
    })
  ),
  async (c) => {
    const inboxId = c.req.param('inboxId');
    const { sourceId, name, email } = c.req.valid('json');

    const [inbox] = await db
      .select()
      .from(inboxes)
      .where(and(eq(inboxes.id, inboxId), eq(inboxes.isEnabled, true)))
      .limit(1);

    if (!inbox) return c.json({ error: 'Inbox not found' }, 404);

    const [existingLink] = await db
      .select({ link: contactInboxes, contact: contacts })
      .from(contactInboxes)
      .innerJoin(contacts, eq(contactInboxes.contactId, contacts.id))
      .where(and(eq(contactInboxes.inboxId, inboxId), eq(contactInboxes.sourceId, sourceId)))
      .limit(1);

    if (existingLink?.link) {
      if (name !== existingLink.contact.name || (email && email !== existingLink.contact.email)) {
        await db
          .update(contacts)
          .set({
            name,
            email: email || existingLink.contact.email,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, existingLink.contact.id));
      }

      let [openConv] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.contactId, existingLink.contact.id),
            eq(conversations.inboxId, inboxId),
            eq(conversations.status, 'open')
          )
        )
        .orderBy(desc(conversations.createdAt))
        .limit(1);

      if (!openConv) {
        [openConv] = await db
          .insert(conversations)
          .values({
            accountId: inbox.accountId,
            inboxId,
            contactId: existingLink.contact.id,
          })
          .returning();
      }

      return c.json({
        conversationId: openConv!.id,
        visitorToken: existingLink.link.visitorToken,
        contact: { id: existingLink.contact.id, name },
      });
    }

    const [contact] = await db
      .insert(contacts)
      .values({
        accountId: inbox.accountId,
        name,
        email: email || null,
        type: 'visitor',
        lastActivityAt: new Date(),
      })
      .returning();

    if (!contact) return c.json({ error: 'Failed to create contact' }, 500);

    const visitorToken = createId();

    await db.insert(contactInboxes).values({
      contactId: contact.id,
      inboxId,
      sourceId,
      visitorToken,
    });

    const [conversation] = await db
      .insert(conversations)
      .values({
        accountId: inbox.accountId,
        inboxId,
        contactId: contact.id,
      })
      .returning();

    if (!conversation) return c.json({ error: 'Failed to create conversation' }, 500);

    return c.json(
      {
        conversationId: conversation.id,
        visitorToken,
        contact: { id: contact.id, name: contact.name },
      },
      201
    );
  }
);

async function resolveVisitor(conversationId: string, visitorToken: string) {
  const [row] = await db
    .select({
      conversation: conversations,
      link: contactInboxes,
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .innerJoin(
      contactInboxes,
      and(
        eq(contactInboxes.contactId, contacts.id),
        eq(contactInboxes.inboxId, conversations.inboxId)
      )
    )
    .where(
      and(eq(conversations.id, conversationId), eq(contactInboxes.visitorToken, visitorToken))
    )
    .limit(1);

  return row ?? null;
}

// GET /public/conversations/:conversationId/messages
publicWidgetRouter.get('/conversations/:conversationId/messages', async (c) => {
  const conversationId = c.req.param('conversationId');
  const visitorToken = c.req.header('X-Visitor-Token');

  if (!visitorToken) return c.json({ error: 'Missing visitor token' }, 401);

  const ctx = await resolveVisitor(conversationId, visitorToken);
  if (!ctx) return c.json({ error: 'Unauthorized' }, 401);

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return c.json({ messages: rows.map(serializeMessage) });
});

// POST /public/conversations/:conversationId/messages
publicWidgetRouter.post(
  '/conversations/:conversationId/messages',
  zValidator('json', z.object({ content: z.string().min(1).max(10000) })),
  async (c) => {
    const conversationId = c.req.param('conversationId');
    const visitorToken = c.req.header('X-Visitor-Token');
    const { content } = c.req.valid('json');

    if (!visitorToken) return c.json({ error: 'Missing visitor token' }, 401);

    const ctx = await resolveVisitor(conversationId, visitorToken);
    if (!ctx) return c.json({ error: 'Unauthorized' }, 401);

    const message = await insertMessage({
      conversationId,
      accountId: ctx.conversation.accountId,
      content,
      senderType: 'contact',
      senderId: ctx.conversation.contactId,
      incrementUnread: true,
    });

    return c.json({ message: serializeMessage(message) }, 201);
  }
);
