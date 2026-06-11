import type { AppSql } from '@/lib/db-sql';
import { isWithinBusinessHours, parseBusinessHours } from '@/lib/business-hours';
import { insertMessage } from '@/lib/conversations';

/** Send one offline system reply per conversation when agents are unavailable. */
export async function maybeSendOfflineAutoReply(
  sql: AppSql,
  conversationId: string,
  accountId: string
) {
  const rows = (await sql`
    SELECT i.offline_message as "offlineMessage",
           i.use_business_hours as "useBusinessHours",
           i.business_hours as "businessHours",
           a.timezone
    FROM conversations c
    INNER JOIN inboxes i ON i.id = c.inbox_id
    INNER JOIN accounts a ON a.id = c.account_id
    WHERE c.id = ${conversationId}::uuid
    LIMIT 1
  `) as {
    offlineMessage: string | null;
    useBusinessHours: boolean;
    businessHours: unknown;
    timezone: string;
  }[];

  const inbox = rows[0];
  if (!inbox) return;

  const hours = parseBusinessHours(inbox.businessHours, inbox.timezone);
  const withinHours = inbox.useBusinessHours
    ? isWithinBusinessHours(hours, inbox.timezone)
    : true;

  const agentsOnline = (await sql`
    SELECT COUNT(*)::int as count FROM account_users au
    WHERE au.account_id = ${accountId}::uuid AND au.status = 'active' AND au.availability = 'online'
  `) as { count: number }[];

  const available = withinHours && (agentsOnline[0]?.count ?? 0) > 0;
  if (available) return;

  const existing = (await sql`
    SELECT 1 FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND sender_type = 'system'
      AND content = ${inbox.offlineMessage ?? 'We are currently offline. We will reply as soon as possible.'}
    LIMIT 1
  `) as unknown[];

  if (existing.length > 0) return;

  await insertMessage({
    conversationId,
    accountId,
    content:
      inbox.offlineMessage ??
      'We are currently offline. Your message has been received and we will reply as soon as possible.',
    senderType: 'system',
    senderId: null,
    incrementUnread: false,
  });
}
