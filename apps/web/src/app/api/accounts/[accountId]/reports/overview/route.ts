import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { getOverviewMetrics } from '@/lib/reporting/events';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const to = url.searchParams.get('to') ?? new Date().toISOString();
  const from =
    url.searchParams.get('from') ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const metrics = await getOverviewMetrics(sql, accountId, from, to);
  return Response.json({ metrics });
}
