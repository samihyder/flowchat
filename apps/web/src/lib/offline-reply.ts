import type { AppSql } from '@/lib/db-sql';
import { insertMessage } from '@/lib/conversations';
import {
  DEFAULT_OFFLINE_RECEIPT,
  getInboxAvailability,
} from '@/lib/inbox-availability';

/** Acknowledge visitor messages received while agents are offline. */
export async function maybeSendOfflineAutoReply(
  sql: AppSql,
  conversationId: string,
  accountId: string
) {
  const rows = (await sql`
    SELECT c.inbox_id as "inboxId",
           i.use_business_hours as "useBusinessHours",
           i.business_hours as "businessHours",
           a.timezone
    FROM conversations c
    INNER JOIN inboxes i ON i.id = c.inbox_id
    INNER JOIN accounts a ON a.id = c.account_id
    WHERE c.id = ${conversationId}::uuid
    LIMIT 1
  `) as {
    inboxId: string;
    useBusinessHours: boolean;
    businessHours: unknown;
    timezone: string;
  }[];

  const inbox = rows[0];
  if (!inbox) return;

  const availability = await getInboxAvailability(sql, inbox.inboxId, accountId, {
    useBusinessHours: inbox.useBusinessHours,
    businessHours: inbox.businessHours,
    timezone: inbox.timezone,
  });

  if (availability.available) return;

  const receipt = DEFAULT_OFFLINE_RECEIPT;

  const existing = (await sql`
    SELECT 1 FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND sender_type IN ('agent', 'system')
      AND content = ${receipt}
    LIMIT 1
  `) as unknown[];

  if (existing.length > 0) return;

  const contactMessages = (await sql`
    SELECT COUNT(*)::int as count FROM messages
    WHERE conversation_id = ${conversationId}::uuid AND sender_type = 'contact'
  `) as { count: number }[];

  if ((contactMessages[0]?.count ?? 0) !== 1) return;

  await insertMessage({
    conversationId,
    accountId,
    content: receipt,
    senderType: 'agent',
    senderId: null,
    incrementUnread: false,
  });
}
