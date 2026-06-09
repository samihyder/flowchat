import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { conversations } from './conversations.js';

export const senderTypeEnum = pgEnum('sender_type', ['contact', 'agent', 'system']);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  senderType: senderTypeEnum('sender_type').notNull(),
  senderId: uuid('sender_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
