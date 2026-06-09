import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { eq, and } from 'drizzle-orm';
import { env } from './env.js';

const sql = neon(env.DATABASE_URL);
const db = drizzle(sql);

const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

const accountUsers = pgTable('account_users', {
  accountId: uuid('account_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: text('role').notNull(),
  availability: text('availability').notNull(),
});

const contactInboxes = pgTable('contact_inboxes', {
  id: uuid('id').primaryKey(),
  contactId: uuid('contact_id').notNull(),
  inboxId: uuid('inbox_id').notNull(),
  visitorToken: text('visitor_token').notNull(),
});

const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey(),
  accountId: uuid('account_id').notNull(),
  contactId: uuid('contact_id').notNull(),
});

export async function validateSession(token: string) {
  const [session] = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session || session.expiresAt < new Date()) return null;

  const [membership] = await db
    .select({ accountId: accountUsers.accountId, role: accountUsers.role })
    .from(accountUsers)
    .where(eq(accountUsers.userId, session.userId))
    .limit(1);

  return { userId: session.userId, accountId: membership?.accountId ?? null };
}

export async function validateVisitor(conversationId: string, visitorToken: string) {
  const [row] = await db
    .select({
      conversationId: conversations.id,
      accountId: conversations.accountId,
      contactId: conversations.contactId,
    })
    .from(conversations)
    .innerJoin(contactInboxes, eq(contactInboxes.contactId, conversations.contactId))
    .where(
      and(eq(conversations.id, conversationId), eq(contactInboxes.visitorToken, visitorToken))
    )
    .limit(1);

  if (!row) return null;
  return row;
}
