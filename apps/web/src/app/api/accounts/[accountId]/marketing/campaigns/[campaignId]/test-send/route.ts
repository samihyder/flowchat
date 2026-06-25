import { neon } from '@neondatabase/serverless';
import { getAccountSettings } from '@/lib/account-settings-db';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import { sendCampaignTestEmail } from '@/lib/marketing/s6m-campaign-launch';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { to_email?: string; toEmail?: string };
    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const settings = await getAccountSettings(sql, accountId);
    const result = await sendCampaignTestEmail(
      sql,
      accountId,
      campaignId,
      auth.userId,
      settings,
      body.to_email ?? body.toEmail
    );

    return Response.json({ ok: true, sentTo: result.sentTo, testValid: true });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
