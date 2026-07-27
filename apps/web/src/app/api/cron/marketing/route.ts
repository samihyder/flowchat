import { neon } from '@/lib/neon';
import { runMarketingJobs } from '@/lib/marketing/job-runner';
import { recordMarketingCronRun } from '@/lib/marketing/marketing-cron-state';
import type { AppSql } from '@/lib/db-sql';
import { requireCronAuth } from '@/lib/cron-auth';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const result = await runMarketingJobs(sql);
    await recordMarketingCronRun(sql, result.s6mProcessed).catch(() => undefined);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    await recordMarketingCronRun(sql, 0, message).catch(() => undefined);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
