import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import { canExportCampaignCsv } from '@/lib/marketing/permissions';
import { exportMarketingCampaignCsv } from '@/lib/marketing/s6m-campaign-stats';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (!canExportCampaignCsv(auth.role)) {
      return Response.json({ error: 'Only administrators can export campaign data.' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const csv = await exportMarketingCampaignCsv(sql, accountId, campaignId);
    const filename = `campaign-${campaignId.slice(0, 8)}-recipients.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
