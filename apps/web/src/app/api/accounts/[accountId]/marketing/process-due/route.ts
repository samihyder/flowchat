import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { runMarketingJobs } from '@/lib/marketing/job-runner';
import { recordMarketingCronRun } from '@/lib/marketing/marketing-cron-state';
import { canLaunchCampaign } from '@/lib/marketing/permissions';

type Params = { params: Promise<{ accountId: string }> };

/** Admin-only: manually run the marketing scheduler (for preview / debugging). */
export async function POST(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || !canLaunchCampaign(auth.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const result = await runMarketingJobs(sql);
    await recordMarketingCronRun(sql, result.s6mProcessed).catch(() => undefined);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scheduler failed';
    await recordMarketingCronRun(sql, 0, message).catch(() => undefined);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
