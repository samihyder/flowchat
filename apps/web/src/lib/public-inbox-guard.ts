import { neon } from '@neondatabase/serverless';
import { isDomainAllowed, parseAllowedDomains } from '@/lib/domain-allowlist';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request-ip';
import type { AppSql } from '@/lib/db-sql';

export async function guardPublicInboxRequest(
  req: Request,
  inboxId: string,
  action: 'visit' | 'session' | 'message',
  sourceId?: string
): Promise<{ ok: true; sql: AppSql } | { ok: false; response: Response }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      ok: false,
      response: Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 }),
    };
  }

  const ip = getClientIp(req) ?? 'unknown';
  const limits = { visit: [30, 60_000], session: [10, 60_000], message: [60, 60_000] } as const;
  const [limit, window] = limits[action];
  const rl = checkRateLimit(`${action}:${inboxId}:${ip}:${sourceId ?? ''}`, limit, window);
  if (!rl.allowed) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
      ),
    };
  }

  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  const sql = neon(databaseUrl);

  const inboxRows = await sql`
    SELECT allowed_domains as "allowedDomains" FROM inboxes
    WHERE id = ${inboxId}::uuid AND is_enabled = true LIMIT 1
  `;
  if (!inboxRows[0]) {
    return { ok: false, response: Response.json({ error: 'Inbox not found' }, { status: 404 }) };
  }

  const allowedDomains = parseAllowedDomains(
    (inboxRows[0] as { allowedDomains: unknown }).allowedDomains
  );
  if (!isDomainAllowed(allowedDomains, origin)) {
    return { ok: false, response: Response.json({ error: 'Domain not authorized' }, { status: 403 }) };
  }

  const blocked = await sql`
    SELECT 1 FROM blocked_ips
    WHERE ip_address = ${ip}
      AND (inbox_id = ${inboxId}::uuid OR inbox_id IS NULL)
    LIMIT 1
  `;
  if (blocked[0]) {
    return { ok: false, response: Response.json({ error: 'Access denied' }, { status: 403 }) };
  }

  return { ok: true, sql: sql as AppSql };
}
