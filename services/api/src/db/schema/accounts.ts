import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'trial']);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }),
  logoUrl: text('logo_url'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  status: accountStatusEnum('status').notNull().default('trial'),
  settings: jsonb('settings').notNull().default({}),
  limits: jsonb('limits').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
