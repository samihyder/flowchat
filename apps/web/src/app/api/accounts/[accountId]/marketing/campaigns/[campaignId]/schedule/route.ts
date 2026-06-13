import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { scheduleCampaign } from '@/lib/marketing/campaign-dispatch';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, campaignId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { scheduledAt?: string };
  if (!body.scheduledAt) return Response.json({ error: 'scheduledAt is required' }, { status: 400 });

  const scheduledAt = new Date(body.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return Response.json({ error: 'Invalid scheduledAt' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    await scheduleCampaign(sql, accountId, campaignId, scheduledAt);
    return Response.json({ ok: true, scheduledAt: scheduledAt.toISOString() });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Schedule failed' }, { status: 400 });
  }
}
