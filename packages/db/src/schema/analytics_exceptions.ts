import { pgTable, uuid, varchar, text, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { inboxes } from './inboxes';

export const analyticsExceptionTypeEnum = pgEnum('analytics_exception_type', ['ip', 'machine']);

export const inboxAnalyticsExceptions = pgTable(
  'inbox_analytics_exceptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    inboxId: uuid('inbox_id')
      .notNull()
      .references(() => inboxes.id, { onDelete: 'cascade' }),
    exceptionType: analyticsExceptionTypeEnum('exception_type').notNull(),
    value: varchar('value', { length: 255 }).notNull(),
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.inboxId, t.exceptionType, t.value)]
);

export type InboxAnalyticsException = typeof inboxAnalyticsExceptions.$inferSelect;
