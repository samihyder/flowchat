import { neon } from '@neondatabase/serverless';
import { runMarketingJobs } from '@/lib/marketing/job-runner';
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
  const result = await runMarketingJobs(sql);
  return Response.json({ ok: true, ...result });
}
