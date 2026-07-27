import { neon } from '@/lib/neon';
import type { AppSql } from '@/lib/db-sql';
import { ingestInboundEmail } from '@/lib/channels/email-inbox';

type Params = { params: Promise<{ inboxId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { inboxId } = await params;

  const secret = process.env.EMAIL_INBOX_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: 'EMAIL_INBOX_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    );
  }
  const provided =
    req.headers.get('x-webhook-secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!provided || provided !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const cfgRows = await sql`
    SELECT account_id as "accountId", forwarding_address as "forwardingAddress"
    FROM inbox_email_configs WHERE inbox_id = ${inboxId}::uuid LIMIT 1
  `;
  const cfg = cfgRows[0] as
    | { accountId: string; forwardingAddress: string | null }
    | undefined;
  if (!cfg) return Response.json({ error: 'Inbox not configured' }, { status: 404 });

  const body = (await req.json()) as {
    fromEmail?: string;
    from?: string;
    fromName?: string;
    subject?: string;
    textBody?: string;
    text?: string;
    htmlBody?: string;
    html?: string;
    messageId?: string;
    inReplyTo?: string;
    references?: string;
  };

  const fromEmail = (body.fromEmail || body.from || '').trim();
  if (!fromEmail) return Response.json({ error: 'fromEmail required' }, { status: 400 });

  try {
    const result = await ingestInboundEmail(sql, cfg.accountId, inboxId, {
      fromEmail,
      fromName: body.fromName,
      subject: body.subject,
      textBody: body.textBody ?? body.text,
      htmlBody: body.htmlBody ?? body.html,
      messageId: body.messageId,
      inReplyTo: body.inReplyTo,
      references: body.references,
    });
    return Response.json(result, { status: result.deduped ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
