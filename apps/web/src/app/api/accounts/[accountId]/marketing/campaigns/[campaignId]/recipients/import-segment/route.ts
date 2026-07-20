import { neon } from '@/lib/neon';
import { z } from 'zod';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import {
  getCampaignRecipients,
  getSegmentImportContactIds,
  putCampaignRecipients,
} from '@/lib/marketing/s6m-recipients';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

const bodySchema = z.object({
  segment_id: z.string().uuid(),
  contact_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = bodySchema.parse(await req.json());
    const sql = neon(process.env.DATABASE_URL!);

    const { contactIds: importIds } = await getSegmentImportContactIds(
      sql,
      accountId,
      body.segment_id
    );

    const current = await getCampaignRecipients(sql, accountId, campaignId);
    const baseIds = body.contact_ids?.length ? body.contact_ids : current.contactIds;
    const merged = [...new Set([...baseIds, ...importIds])];

    const result = await putCampaignRecipients(sql, accountId, campaignId, merged);

    return Response.json({
      imported: importIds.length,
      mergedContactIds: merged,
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
