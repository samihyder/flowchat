/** Consumer / free-mail domains — no global company record. */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'hotmail.com',
  'hotmail.co.uk',
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
  'gmx.com',
  'gmx.net',
  'mail.com',
  'yandex.com',
  'zoho.com',
  'fastmail.com',
  'hey.com',
  'tutanota.com',
  'qq.com',
  '163.com',
]);

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

export function isFreeEmailDomain(domain: string): boolean {
  const d = normalizeDomain(domain);
  if (FREE_EMAIL_DOMAINS.has(d)) return true;
  // subdomains of free providers, e.g. mail.google.com → still gmail ecosystem
  for (const free of FREE_EMAIL_DOMAINS) {
    if (d === free || d.endsWith(`.${free}`)) return true;
  }
  return false;
}

/** Extract registrable corporate domain from an email, or null if not applicable. */
export function extractCorporateDomain(email: string | null | undefined): string | null {
  if (!email?.trim()) return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 1 || at === trimmed.length - 1) return null;

  const domain = normalizeDomain(trimmed.slice(at + 1));
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null;
  if (isFreeEmailDomain(domain)) return null;

  return domain;
}

/** Best-effort display name before enrichment APIs run. */
export function guessCompanyNameFromDomain(domain: string): string {
  const base = normalizeDomain(domain).split('.')[0] ?? domain;
  if (!base) return domain;
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
