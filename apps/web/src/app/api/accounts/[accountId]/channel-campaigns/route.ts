import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createChannelCampaign, listChannelCampaigns } from '@/lib/campaigns/channel-campaigns';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ campaigns: await listChannelCampaigns(sql, accountId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string; channelType?: string; inboxId?: string | null; segmentId?: string | null;
    templateName?: string | null; templateBody?: string | null; scheduledAt?: string | null;
    contactIds?: string[];
  };
  if (!body.name?.trim() || !body.channelType) {
    return Response.json({ error: 'name and channelType required' }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const campaign = await createChannelCampaign(sql, accountId, auth.userId, {
    name: body.name.trim(), channelType: body.channelType, inboxId: body.inboxId,
    segmentId: body.segmentId, templateName: body.templateName, templateBody: body.templateBody,
    scheduledAt: body.scheduledAt, contactIds: body.contactIds,
  });
  return Response.json({ campaign }, { status: 201 });
}
