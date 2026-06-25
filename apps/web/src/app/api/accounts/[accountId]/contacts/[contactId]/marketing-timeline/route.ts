import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import { getContactMarketingTimeline } from '@/lib/marketing/s6m-marketing-timeline';

type Params = { params: Promise<{ accountId: string; contactId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { accountId, contactId } = await params;
    const token = getBearerToken(_req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const events = await getContactMarketingTimeline(sql, accountId, contactId);
    return Response.json({ events });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
