import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import {
  createMarketingCampaignDraft,
  listMarketingCampaigns,
  type MarketingCampaignStatus,
} from '@/lib/marketing/s6m-campaigns';

type Params = { params: Promise<{ accountId: string }> };

const LIST_STATUSES = new Set([
  'all',
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
]);

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const statusParam = url.searchParams.get('status') ?? 'all';
    const q = url.searchParams.get('q') ?? undefined;
    const status = LIST_STATUSES.has(statusParam)
      ? (statusParam as MarketingCampaignStatus | 'all')
      : 'all';

    const sql = neon(process.env.DATABASE_URL!);
    const result = await listMarketingCampaigns(sql, accountId, {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      status,
      q,
    });

    return Response.json({
      campaigns: result.campaigns,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      summary: result.summary,
    });
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
