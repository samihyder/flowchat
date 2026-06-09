import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { contacts } from './contacts.js';
import { inboxes } from './inboxes.js';

export const contactInboxes = pgTable(
  'contact_inboxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    inboxId: uuid('inbox_id')
      .notNull()
      .references(() => inboxes.id, { onDelete: 'cascade' }),
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    visitorToken: text('visitor_token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('contact_inboxes_inbox_source_idx').on(t.inboxId, t.sourceId)]
);

export type ContactInbox = typeof contactInboxes.$inferSelect;
export type NewContactInbox = typeof contactInboxes.$inferInsert;
