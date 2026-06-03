import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { inboxes } from './inboxes.js';
import { users } from './users.js';

export const inboxMembers = pgTable(
  'inbox_members',
  {
    inboxId: uuid('inbox_id')
      .notNull()
      .references(() => inboxes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.inboxId, t.userId] })]
);

export type InboxMember = typeof inboxMembers.$inferSelect;
export type NewInboxMember = typeof inboxMembers.$inferInsert;
