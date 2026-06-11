import { PRODUCTION_WEB_URL } from '@/lib/widget-embed';

export function normalizeDomain(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

function originHostname(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return normalizeDomain(new URL(origin).hostname);
  } catch {
    return null;
  }
}

/** True when the request comes from the FlowChat web app (e.g. /test-widget.html). */
export function isFlowChatAppOrigin(origin: string | null): boolean {
  const host = originHostname(origin);
  if (!host) return false;
  if (host === 'localhost') return true;
  try {
    return host === normalizeDomain(new URL(PRODUCTION_WEB_URL).hostname);
  } catch {
    return false;
  }
}

export function isDomainAllowed(allowedDomains: string[] | null | undefined, origin: string | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  if (isFlowChatAppOrigin(origin)) return true;
  if (!origin) return false;

  const host = originHostname(origin);
  if (!host) return false;

  return allowedDomains.some((d) => {
    const pattern = normalizeDomain(d.trim());
    if (!pattern) return false;
    return host === pattern || host.endsWith(`.${pattern}`);
  });
}

export function parseAllowedDomains(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((d) => typeof d === 'string');
  return [];
}
