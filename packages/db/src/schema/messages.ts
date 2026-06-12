import { pgTable, uuid, text, timestamp, pgEnum, boolean, varchar } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { conversations } from './conversations';
import { users } from './users';

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
  isPrivate: boolean('is_private').notNull().default(false),
  clientMessageId: varchar('client_message_id', { length: 64 }),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
