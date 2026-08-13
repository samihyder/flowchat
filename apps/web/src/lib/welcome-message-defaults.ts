import type { AccountSettings } from '@/lib/account-settings';

/**
 * Tenant-agnostic fallback copy — used only when a tenant hasn't set a
 * workspace default or a per-inbox override. Every tenant on this platform
 * gets their own inbox/account name folded in via resolveWelcomeTitle();
 * nothing here should ever hardcode a specific business's name or pitch.
 */
export const DEFAULT_GREETING_MESSAGES = [
  'Hi there! 👋',
  'How can we help you today?',
];

export const DEFAULT_WELCOME_TITLE = 'Chat with us';
export const DEFAULT_WELCOME_TAGLINE = 'We typically reply in a few minutes';

export function resolveGreetingMessages(
  greetingMessages: unknown,
  greetingMessage: string | null | undefined,
  accountSettings?: AccountSettings | null
): string[] {
  let msgs: string[] = [];
  if (Array.isArray(greetingMessages)) {
    msgs = greetingMessages
      .map((m) => (typeof m === 'string' ? m.trim() : ''))
      .filter(Boolean);
  } else if (typeof greetingMessages === 'string' && greetingMessages.trim()) {
    try {
      const parsed: unknown = JSON.parse(greetingMessages);
      if (Array.isArray(parsed)) {
        msgs = parsed
          .map((m) => (typeof m === 'string' ? m.trim() : ''))
          .filter(Boolean);
      } else {
        msgs = greetingMessages
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
      }
    } catch {
      msgs = greetingMessages
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }
  if (msgs.length > 0) return msgs;

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

  return [...DEFAULT_GREETING_MESSAGES];
}

/**
 * @param fallbackName Inbox or account name to personalize the generic
 * default with (e.g. "Chat with Acme Co") when no explicit title is set at
 * any level. Omit only when no name is available yet (e.g. a blank new-inbox
 * form).
 */
export function resolveWelcomeTitle(
  inboxTitle: string | null | undefined,
  accountSettings?: AccountSettings | null,
  fallbackName?: string | null
): string {
  if (inboxTitle?.trim()) return inboxTitle.trim();
  if (accountSettings?.autoWelcomeTitle?.trim()) return accountSettings.autoWelcomeTitle.trim();
  if (fallbackName?.trim()) return `Chat with ${fallbackName.trim()}`;
  return DEFAULT_WELCOME_TITLE;
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
    return inboxTagline?.trim() || accountSettings?.autoWelcomeTagline?.trim() || DEFAULT_WELCOME_TAGLINE;
  }
  return DEFAULT_WELCOME_TAGLINE;
}
