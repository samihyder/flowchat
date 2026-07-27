import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import {
  deleteChannelCampaign, getChannelCampaign, listCampaignContacts, updateChannelCampaign,
} from '@/lib/campaigns/channel-campaigns';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, campaignId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const campaign = await getChannelCampaign(sql, accountId, campaignId);
  if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 });
  const contacts = await listCampaignContacts(sql, campaignId);
  return Response.json({ campaign, contacts });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, campaignId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const campaign = await updateChannelCampaign(sql, accountId, campaignId, {
    name: body.name as string | undefined,
    channelType: body.channelType as string | undefined,
    inboxId: body.inboxId as string | null | undefined,
    segmentId: body.segmentId as string | null | undefined,
    templateName: body.templateName as string | null | undefined,
    templateBody: body.templateBody as string | null | undefined,
    status: body.status as string | undefined,
    scheduledAt: body.scheduledAt as string | null | undefined,
  });
  if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ campaign });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, campaignId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteChannelCampaign(sql, accountId, campaignId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
