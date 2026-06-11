import { emailDomain } from '@/lib/email-domain';

/** Returns true when email domain is allowed for invites (empty list = any work email). */
export function isInviteEmailAllowed(email: string, allowedDomains: string[]): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (allowedDomains.length === 0) return true;
  return allowedDomains.some(
    (d) => domain === d.toLowerCase() || domain.endsWith(`.${d.toLowerCase()}`)
  );
}

export function parseInviteDomainsText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}
