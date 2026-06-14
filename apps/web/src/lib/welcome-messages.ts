import type { AppSql } from '@/lib/db-sql';
import { insertMessage } from '@/lib/conversations';
import type { AccountSettings } from '@/lib/account-settings';
import { parseAccountSettings } from '@/lib/account-settings';
import {
  DEFAULT_OFFLINE_MESSAGE,
  getInboxAvailability,
} from '@/lib/inbox-availability';

/** Mutex Systems defaults — derived from mutexsystemsltd.com positioning & services. */
export const MUTEX_DEFAULT_GREETING_MESSAGES = [
  'Hi, welcome to Mutex Systems!',
  'We help businesses build secure applications, integrate AI automation, and deploy scalable cloud infrastructure with enterprise-grade cybersecurity.',
  'How can our experts help you today — software development, AI, cybersecurity, cloud, or hardware?',
];

export const MUTEX_DEFAULT_WELCOME_TITLE = 'Chat with Mutex Systems';
export const MUTEX_DEFAULT_WELCOME_TAGLINE =
  'UK-headquartered · Our experts typically respond within 24 hours';

export function resolveGreetingMessages(
  greetingMessages: unknown,
  greetingMessage: string | null | undefined,
  accountSettings?: AccountSettings | null
): string[] {
  if (Array.isArray(greetingMessages)) {
    const msgs = greetingMessages
      .map((m) => (typeof m === 'string' ? m.trim() : ''))
      .filter(Boolean);
    if (msgs.length > 0) return msgs;
  }

  if (greetingMessage?.trim()) {
    const lines = greetingMessage
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) return lines;
  }

  if (accountSettings?.autoMessages?.length) {
    return accountSettings.autoMessages.map((m) => m.trim()).filter(Boolean);
  }

  return [...MUTEX_DEFAULT_GREETING_MESSAGES];
}

export function resolveWelcomeTitle(
  inboxTitle: string | null | undefined,
  accountSettings?: AccountSettings | null
): string {
  if (inboxTitle?.trim()) return inboxTitle.trim();
  if (accountSettings?.autoWelcomeTitle?.trim()) return accountSettings.autoWelcomeTitle.trim();
  return MUTEX_DEFAULT_WELCOME_TITLE;
}

export function resolveWelcomeTagline(
  inboxTagline: string | null | undefined,
  accountSettings?: AccountSettings | null,
  offline?: boolean
): string {
  if (!offline && inboxTagline?.trim()) return inboxTagline.trim();
  if (!offline && accountSettings?.autoWelcomeTagline?.trim()) {
    return accountSettings.autoWelcomeTagline.trim();
  }
  if (offline) {
    return inboxTagline?.trim() || accountSettings?.autoWelcomeTagline?.trim() || MUTEX_DEFAULT_WELCOME_TAGLINE;
  }
  return MUTEX_DEFAULT_WELCOME_TAGLINE;
}

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
