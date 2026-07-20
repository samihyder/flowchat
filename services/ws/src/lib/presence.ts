import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { eq, and } from 'drizzle-orm';
import { env } from './env.js';

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: 'require',
});
const db = drizzle(client);

const accountUsers = pgTable('account_users', {
  accountId: uuid('account_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: text('role').notNull(),
  availability: text('availability').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export async function setAvailability(
  userId: string,
  accountId: string,
  availability: 'online' | 'busy' | 'offline'
) {
  await db
    .update(accountUsers)
    .set({ availability, updatedAt: new Date() })
    .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId)));
}
