import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { processCampaignBatch } from '@/lib/marketing/campaign-dispatch';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, campaignId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await processCampaignBatch(sql, accountId, campaignId, 25);
  return Response.json(result);
}
