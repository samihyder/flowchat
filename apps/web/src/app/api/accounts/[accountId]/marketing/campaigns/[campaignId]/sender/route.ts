import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { marketingErrorResponse } from '@/lib/marketing/errors';
import { getCampaignSender, putCampaignSender } from '@/lib/marketing/s6m-campaign-sender';

type Params = { params: Promise<{ accountId: string; campaignId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { accountId, campaignId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const sender = await getCampaignSender(sql, accountId, campaignId);
    return Response.json({ sender });
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

    const body = (await req.json()) as Record<string, unknown>;
    const sql = neon(process.env.DATABASE_URL!);
    const sender = await putCampaignSender(sql, accountId, campaignId, {
      senderId: (body.sender_id ?? body.senderId) as string | null | undefined,
      fromName: (body.from_name ?? body.fromName) as string | undefined,
      fromEmail: (body.from_email ?? body.fromEmail) as string | undefined,
      replyTo: (body.reply_to ?? body.replyTo) as string | null | undefined,
      signatureHtml: (body.signature_html ?? body.signatureHtml) as string | null | undefined,
      useWorkspaceSignature: (body.use_workspace_signature ?? body.useWorkspaceSignature) as
        | boolean
        | undefined,
      meetingLink: (body.meeting_link ?? body.meetingLink) as string | null | undefined,
      portfolioLink: (body.portfolio_link ?? body.portfolioLink) as string | null | undefined,
    });

    return Response.json({ sender });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
