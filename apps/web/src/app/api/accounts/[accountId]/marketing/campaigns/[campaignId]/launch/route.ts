import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import { launchMarketingCampaign } from '@/lib/marketing/s6m-campaign-launch';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const result = await launchMarketingCampaign(
      sql,
      accountId,
      campaignId,
      auth.userId,
      auth.role
    );

    return Response.json({
      status: result.status,
      launchedAt: result.launchedAt,
      launchedBy: auth.userId,
    });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
