import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import {
  createMarketingCampaignDraft,
  listMarketingCampaigns,
} from '@/lib/marketing/s6m-campaigns';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const campaigns = await listMarketingCampaigns(sql, accountId);
    return Response.json({ campaigns });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { accountId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const sql = neon(process.env.DATABASE_URL!);
    const campaign = await createMarketingCampaignDraft(sql, accountId, auth.userId, body.name);

    return Response.json(
      {
        id: campaign.id,
        status: campaign.status,
        created_at: campaign.createdAt,
        created_by: campaign.createdBy,
        campaign,
      },
      { status: 201 }
    );
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
