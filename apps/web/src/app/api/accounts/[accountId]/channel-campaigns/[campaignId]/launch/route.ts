import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { dispatchChannelCampaign } from '@/lib/campaigns/channel-campaigns';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { accountId, campaignId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Only administrators can launch channel campaigns.' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await dispatchChannelCampaign(sql, accountId, campaignId);
  if (result.error === 'Campaign not found') {
    return Response.json({ error: result.error }, { status: 404 });
  }
  if (result.error) {
    return Response.json(
      {
        error: result.error,
        sent: result.sent,
        dispatched: result.dispatched,
        campaign: result.campaign,
      },
      { status: 501 }
    );
  }
  return Response.json({
    sent: result.sent,
    dispatched: result.dispatched,
    campaign: result.campaign,
  });
}
