import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { eq, and } from 'drizzle-orm';
import { env } from './env.js';

const sql = neon(env.DATABASE_URL);
const db = drizzle(sql);

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
