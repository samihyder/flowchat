import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const labels = pgTable(
  'labels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 20 }).notNull().default('#6366F1'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.accountId, t.name)]
);

export const conversationLabels = pgTable(
  'conversation_labels',
  {
    conversationId: uuid('conversation_id').notNull(),
    labelId: uuid('label_id').notNull(),
  },
  (t) => [unique().on(t.conversationId, t.labelId)]
);

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
