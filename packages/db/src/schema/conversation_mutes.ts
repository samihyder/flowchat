import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { users } from './users';
import { accounts } from './accounts';

/** Per-user mute of a single conversation's notification sound/badge (not shared across agents). */
export const conversationMutes = pgTable(
  'conversation_mutes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('conversation_mutes_conversation_user_idx').on(t.conversationId, t.userId),
    index('conversation_mutes_user_idx').on(t.userId, t.accountId),
  ]
);

export type ConversationMute = typeof conversationMutes.$inferSelect;
export type NewConversationMute = typeof conversationMutes.$inferInsert;
