import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { users } from './users';

export const channelTypeEnum = pgEnum('channel_type', [
  'web_widget',
  'email',
  'whatsapp',
  'facebook',
  'instagram',
  'telegram',
  'sms',
  'api',
]);

export const inboxes = pgTable('inboxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  channelType: channelTypeEnum('channel_type').notNull().default('web_widget'),
  avatarUrl: text('avatar_url'),
  greetingMessage: text('greeting_message'),
  welcomeTitle: varchar('welcome_title', { length: 255 }),
  welcomeTagline: varchar('welcome_tagline', { length: 255 }),
  widgetColor: varchar('widget_color', { length: 20 }).default('#1F93FF'),
  widgetIcon: varchar('widget_icon', { length: 32 }).default('chat'),
  widgetTheme: jsonb('widget_theme'),
  websiteUrl: varchar('website_url', { length: 500 }),
  defaultAssigneeId: uuid('default_assignee_id').references(() => users.id, { onDelete: 'set null' }),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Inbox = typeof inboxes.$inferSelect;
export type NewInbox = typeof inboxes.$inferInsert;
