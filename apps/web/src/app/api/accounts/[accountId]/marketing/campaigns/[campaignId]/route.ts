import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import { getMarketingCampaign, patchMarketingCampaign } from '@/lib/marketing/s6m-campaigns';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const campaign = await getMarketingCampaign(sql, accountId, campaignId);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    return Response.json({ campaign });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json()) as {
      name?: string;
      current_step?: number;
      currentStep?: number;
      schedule_timezone?: string;
      scheduleTimezone?: string;
      schedule_mode?: 'campaign' | 'recipient_local';
      scheduleMode?: 'campaign' | 'recipient_local';
      sendRateEnabled?: boolean;
      sendRatePerHour?: number;
      autoMarkBounced?: boolean;
      processUnsubscribes?: boolean;
    };
    const sql = neon(process.env.DATABASE_URL!);
    const campaign = await patchMarketingCampaign(sql, accountId, campaignId, {
      name: body.name,
      currentStep: body.current_step ?? body.currentStep,
      scheduleTimezone: body.schedule_timezone ?? body.scheduleTimezone,
      scheduleMode: body.schedule_mode ?? body.scheduleMode,
      sendRateEnabled: body.sendRateEnabled,
      sendRatePerHour: body.sendRatePerHour,
      autoMarkBounced: body.autoMarkBounced,
      processUnsubscribes: body.processUnsubscribes,
    });

    return Response.json({ campaign });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
