/** Common consumer / disposable domains blocked for workspace sign-up. */
const BLOCKED_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'yandex.com',
  'yandex.ru',
  'zoho.com',
  'fastmail.com',
  'tutanota.com',
  'hey.com',
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
]);

export function emailDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

export function isWorkEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (BLOCKED_DOMAINS.has(domain)) return false;
  // Block obvious disposable patterns
  if (domain.includes('tempmail') || domain.includes('throwaway') || domain.includes('fakeinbox')) {
    return false;
  }
  return true;
}

export const WORK_EMAIL_MESSAGE =
  'Use your company work email. Public providers (Gmail, Yahoo, Outlook, etc.) are not allowed for workspace sign-up.';
