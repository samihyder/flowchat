import { neon } from '@/lib/neon';
import type { AppSql } from '@/lib/db-sql';
import { checkSlaBreaches } from '@/lib/sla/policies';
import { requireCronAuth } from '@/lib/cron-auth';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const breaches = await checkSlaBreaches(sql);
    return Response.json({ ok: true, breaches });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
