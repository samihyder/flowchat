import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import {
  controlMarketingCampaign,
  getCampaignControlPreview,
  type CampaignControlAction,
} from '@/lib/marketing/s6m-campaign-control';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(_req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const preview = await getCampaignControlPreview(sql, accountId, campaignId);
    return Response.json({ preview });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json()) as { action?: CampaignControlAction };
    if (!body.action || !['pause', 'cancel', 'resume'].includes(body.action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const result = await controlMarketingCampaign(
      sql,
      accountId,
      campaignId,
      body.action,
      auth.role,
      auth.userId
    );

    return Response.json({ ok: true, status: result.status });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
