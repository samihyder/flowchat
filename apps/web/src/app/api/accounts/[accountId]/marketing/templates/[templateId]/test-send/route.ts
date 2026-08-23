import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { applyMergeTags, buildSendMergeExtras } from '@/lib/marketing/merge-tags';
import { sendMarketingEmail } from '@/lib/marketing/email-send';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; templateId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, templateId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const body = (await req.json()) as { to?: string; senderId?: string };
  let to = body.to?.trim();
  if (!to) {
    const users = await sql`
      SELECT email FROM users WHERE id = ${auth.userId}::uuid LIMIT 1
    `;
    to = (users[0] as { email: string } | undefined)?.email;
  }
  if (!to) return Response.json({ error: 'Recipient email is required' }, { status: 400 });
  const templates = await sql`
    SELECT subject, html_body as "htmlBody", text_body as "textBody"
    FROM email_templates
    WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const template = templates[0] as { subject: string; htmlBody: string; textBody: string | null } | undefined;
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  const settings = await getAccountSettings(sql, accountId);
  const mergeCtx = {
    name: 'Preview',
    email: to,
    phone: null,
    type: 'lead',
    customAttributes: {},
  };

  let senderName = settings.marketingFromName ?? '';
  let senderEmail = settings.marketingFromEmail ?? '';
  if (body.senderId) {
    const senderRows = await sql`
      SELECT from_name as "fromName", from_email as "fromEmail"
      FROM marketing_senders WHERE id = ${body.senderId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
    `;
    const senderRow = senderRows[0] as { fromName: string; fromEmail: string } | undefined;
    if (senderRow) {
      senderName = senderRow.fromName;
      senderEmail = senderRow.fromEmail;
    }
  }
  const mergeExtras = buildSendMergeExtras({
    senderName,
    senderEmail,
    meetingLink: settings.marketingCalendlyUrl,
    portfolioLink: settings.marketingPortfolioUrl,
    contactMessage: 'This is a sample contact message for preview purposes.',
  });

  const result = await sendMarketingEmail(sql, accountId, auth.userId, settings, {
    to,
    subject: `[TEST] ${applyMergeTags(template.subject, mergeCtx, mergeExtras)}`,
    html: applyMergeTags(template.htmlBody, mergeCtx, mergeExtras),
    text: template.textBody ? applyMergeTags(template.textBody, mergeCtx, mergeExtras) : undefined,
    senderId: body.senderId ?? null,
    mergeContact: mergeCtx,
    isTest: true,
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json({ ok: true, messageId: result.messageId, sentTo: to });
}
