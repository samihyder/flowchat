import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import {
  getCampaignRecipients,
  putCampaignRecipients,
} from '@/lib/marketing/s6m-recipients';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

const putBodySchema = z.object({
  contact_ids: z.array(z.string().uuid()).min(1),
});

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const data = await getCampaignRecipients(sql, accountId, campaignId);
    return Response.json({
      contactIds: data.contactIds,
      recipients: data.recipients.map((r) => ({
        contactId: r.contactId,
        name: r.name,
        email: r.email,
        company: r.company,
        marketingStatus: r.marketingStatus,
        recipientStatus: r.recipientStatus,
        exclusionReason: r.exclusionReason,
      })),
      summary: {
        selected: data.summary.selected,
        suppressed: data.summary.suppressed,
      },
    });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = putBodySchema.parse(await req.json());
    const sql = neon(process.env.DATABASE_URL!);
    const contactIds = body.contact_ids;
    const result = await putCampaignRecipients(sql, accountId, campaignId, contactIds);

    return Response.json({
      selected: result.selected,
      excluded: result.excluded,
      recipients: result.recipients.map((r) => ({
        contactId: r.contactId,
        name: r.name,
        email: r.email,
        company: r.company,
        marketingStatus: r.marketingStatus,
        recipientStatus: r.recipientStatus,
        exclusionReason: r.exclusionReason,
      })),
    });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
