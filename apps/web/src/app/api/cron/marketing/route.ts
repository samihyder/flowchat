import { neon } from '@neondatabase/serverless';
import { runMarketingJobs } from '@/lib/marketing/job-runner';
import { recordMarketingCronRun } from '@/lib/marketing/marketing-cron-state';
import type { AppSql } from '@/lib/db-sql';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
