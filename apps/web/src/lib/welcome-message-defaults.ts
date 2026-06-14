import type { AccountSettings } from '@/lib/account-settings';

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
