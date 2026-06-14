import type { AppSql } from '@/lib/db-sql';
import { insertMessage } from '@/lib/conversations';
import { parseAccountSettings } from '@/lib/account-settings';
import {
  DEFAULT_OFFLINE_MESSAGE,
  getInboxAvailability,
} from '@/lib/inbox-availability';

export {
  MUTEX_DEFAULT_GREETING_MESSAGES,
  MUTEX_DEFAULT_WELCOME_TAGLINE,
  MUTEX_DEFAULT_WELCOME_TITLE,
  resolveGreetingMessages,
  resolveWelcomeTitle,
  resolveWelcomeTagline,
} from '@/lib/welcome-message-defaults';

import { resolveGreetingMessages } from '@/lib/welcome-message-defaults';

function appendOfflineNotice(messages: string[], offlineMessage: string | null): string[] {
  const notice = offlineMessage?.trim() || DEFAULT_OFFLINE_MESSAGE;
  if (messages.includes(notice)) return messages;
  return [...messages, notice];
}

async function insertAgentMessages(
  sql: AppSql,
  conversationId: string,
  accountId: string,
  messages: string[]
) {
  for (const content of messages) {
    await insertMessage({
      sql,
      conversationId,
      accountId,
      content,
      senderType: 'agent',
      senderId: null,
      incrementUnread: false,
    });
  }
}

/** Insert provisioned auto messages when a new conversation starts (online and offline). */
export async function sendWelcomeMessages(
  sql: AppSql,
  conversationId: string,
  accountId: string,
  inboxId: string
) {
  const rows = (await sql`
    SELECT i.greeting_messages as "greetingMessages", i.greeting_message as "greetingMessage",
           i.offline_message as "offlineMessage",
           i.use_business_hours as "useBusinessHours",
           i.business_hours as "businessHours",
           a.settings as "accountSettings", a.timezone
    FROM inboxes i
    INNER JOIN accounts a ON a.id = i.account_id
    WHERE i.id = ${inboxId}::uuid
    LIMIT 1
  `) as {
    greetingMessages: unknown;
    greetingMessage: string | null;
    offlineMessage: string | null;
    useBusinessHours: boolean;
    businessHours: unknown;
    accountSettings: unknown;
    timezone: string;
  }[];

  const inbox = rows[0];
  if (!inbox) return;

  const existing = (await sql`
    SELECT 1 FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND sender_type = 'agent'
    LIMIT 1
  `) as unknown[];

  if (existing.length > 0) return;

  const accountSettings = parseAccountSettings(inbox.accountSettings);
  const availability = await getInboxAvailability(sql, inboxId, accountId, {
    useBusinessHours: inbox.useBusinessHours,
    businessHours: inbox.businessHours,
    timezone: inbox.timezone,
  });

  let messages = resolveGreetingMessages(
    inbox.greetingMessages,
    inbox.greetingMessage,
    accountSettings
  );

  if (!availability.available) {
    messages = appendOfflineNotice(messages, inbox.offlineMessage);
  }

  if (messages.length === 0) return;

  await insertAgentMessages(sql, conversationId, accountId, messages);
}
