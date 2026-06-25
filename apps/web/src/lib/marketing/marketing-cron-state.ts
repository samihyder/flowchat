import type { AppSql } from '@/lib/db-sql';

const CRON_KEY = 'marketing_cron';

export type MarketingCronState = {
  lastRunAt: string | null;
  lastProcessed: number;
  lastError: string | null;
};

export async function recordMarketingCronRun(
  sql: AppSql,
  processed: number,
  error?: string | null
) {
  try {
    const value = {
      lastRunAt: new Date().toISOString(),
      lastProcessed: processed,
      lastError: error ?? null,
    };
    await sql`
      INSERT INTO marketing_system_state (key, value, updated_at)
      VALUES (${CRON_KEY}, ${JSON.stringify(value)}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  } catch {
    /* table may not exist until migration 0023 is applied */
  }
}

export async function getMarketingCronState(sql: AppSql): Promise<MarketingCronState> {
  try {
    const rows = await sql`
      SELECT value, updated_at as "updatedAt"
      FROM marketing_system_state
      WHERE key = ${CRON_KEY}
      LIMIT 1
    `;
    const row = rows[0] as { value: Record<string, unknown>; updatedAt: Date } | undefined;
    if (!row) {
      return { lastRunAt: null, lastProcessed: 0, lastError: null };
    }
    const v = row.value;
    return {
      lastRunAt: (v.lastRunAt as string) ?? new Date(row.updatedAt).toISOString(),
      lastProcessed: Number(v.lastProcessed ?? 0),
      lastError: (v.lastError as string | null) ?? null,
    };
  } catch {
    return { lastRunAt: null, lastProcessed: 0, lastError: null };
  }
}

export function isCronHealthy(state: MarketingCronState, maxAgeMs = 5 * 60 * 1000): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (!state.lastRunAt) return false;
  if (state.lastError) return false;
  return Date.now() - new Date(state.lastRunAt).getTime() < maxAgeMs;
}
