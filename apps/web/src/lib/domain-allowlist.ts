export function normalizeDomain(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

export function isDomainAllowed(allowedDomains: string[] | null | undefined, origin: string | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  if (!origin) return false;

  try {
    const host = normalizeDomain(new URL(origin).hostname);
    return allowedDomains.some((d) => {
      const pattern = normalizeDomain(d.trim());
      if (!pattern) return false;
      return host === pattern || host.endsWith(`.${pattern}`);
    });
  } catch {
    return false;
  }
}

export function parseAllowedDomains(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((d) => typeof d === 'string');
  return [];
}
