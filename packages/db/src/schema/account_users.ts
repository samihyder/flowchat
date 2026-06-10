import { pgTable, uuid, varchar, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { users } from './users';

export const agentRoleEnum = pgEnum('agent_role', ['administrator', 'agent']);
export const availabilityEnum = pgEnum('availability_status', ['online', 'busy', 'offline']);
export const accountUserStatusEnum = pgEnum('account_user_status', ['pending', 'active', 'suspended']);

export const accountUsers = pgTable(
  'account_users',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: agentRoleEnum('role').notNull().default('agent'),
    status: accountUserStatusEnum('status').notNull().default('active'),
    availability: availabilityEnum('availability').notNull().default('offline'),
    displayName: varchar('display_name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.userId] })]
);

export type AccountUser = typeof accountUsers.$inferSelect;
export type NewAccountUser = typeof accountUsers.$inferInsert;
