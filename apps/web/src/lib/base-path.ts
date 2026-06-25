/** App subpath when hosted under a parent domain (e.g. /FlowChat). Empty at root deploys. */
/** On Vercel, default /FlowChat subpath when env is unset (preview deployments). */
export function getBasePath(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_PATH ??
    (process.env.VERCEL ? '/FlowChat' : '');
  if (!raw || raw === '/') return '';
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function withBasePath(path: string): string {
  const base = getBasePath();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}
