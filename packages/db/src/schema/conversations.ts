import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { inboxes } from './inboxes';
import { contacts } from './contacts';
import { users } from './users';
import { teams } from './teams';

export const conversationStatusEnum = pgEnum('conversation_status', [
  'open',
  'pending',
  'resolved',
  'snoozed',
]);

export const conversationPriorityEnum = pgEnum('conversation_priority', [
  'urgent',
  'high',
  'medium',
  'low',
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  inboxId: uuid('inbox_id')
    .notNull()
    .references(() => inboxes.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  status: conversationStatusEnum('status').notNull().default('open'),
  priority: conversationPriorityEnum('priority').notNull().default('medium'),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  awaitingReplySince: timestamp('awaiting_reply_since', { withTimezone: true }),
  missedAlertSentAt: timestamp('missed_alert_sent_at', { withTimezone: true }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  lastMessagePreview: text('last_message_preview'),
  unreadCount: integer('unread_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
