import { neon } from '@neondatabase/serverless';
import { getCredentialSecret } from '@/lib/credentials/store';
import { verifySvixWebhook } from '@/lib/credentials/webhook-signature';
import { handleResendWebhookEvent } from '@/lib/marketing/resend-events';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ credentialId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { credentialId } = await params;
  const rawBody = await req.text();
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const rows = await sql`
    SELECT account_id as "accountId" FROM account_service_credentials
    WHERE id = ${credentialId}::uuid AND status = 'active' LIMIT 1
  `;
  const accountId = (rows[0] as { accountId: string } | undefined)?.accountId;
  if (!accountId) return Response.json({ error: 'Unknown credential' }, { status: 404 });

  const cred = await getCredentialSecret(sql, accountId, credentialId);
  if (!cred) return Response.json({ error: 'Credential not found' }, { status: 404 });

  const webhookSecret =
    typeof cred.row.config.webhookSigningSecret === 'string'
      ? cred.row.config.webhookSigningSecret
      : '';

  if (webhookSecret) {
    const verified = verifySvixWebhook(rawBody, req.headers, webhookSecret);
    if (!verified) {
      return Response.json({ error: 'Invalid webhook signature — check the whsec_ signing secret from Resend' }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as { type: string; data?: Record<string, unknown> };

  if (cred.row.provider === 'resend') {
    await handleResendWebhookEvent(sql, body);
    return Response.json({ ok: true });
  }

  if (cred.row.provider === 'sendgrid') {
    const events = Array.isArray(body) ? body : [body];
    for (const event of events as { event?: string; sg_message_id?: string; email?: string }[]) {
      const ev = event.event ?? '';
      const type =
        ev === 'delivered'
          ? 'email.delivered'
          : ev === 'open'
            ? 'email.opened'
            : ev === 'click'
              ? 'email.clicked'
              : ev === 'bounce'
                ? 'email.bounced'
                : ev === 'spamreport'
                  ? 'email.complained'
                  : ev === 'unsubscribe' || ev === 'group_unsubscribe'
                    ? 'email.unsubscribed'
                    : null;
      if (type && event.sg_message_id) {
        await handleResendWebhookEvent(sql, {
          type,
          data: { email_id: event.sg_message_id, to: event.email ? [event.email] : undefined },
        });
      }
    }
    return Response.json({ ok: true });
  }

  if (cred.row.provider === 'mailgun') {
    const eventData = (body as { 'event-data'?: { event?: string; message?: { headers?: { 'message-id'?: string } }; recipient?: string } })['event-data'];
    if (eventData?.message?.headers?.['message-id']) {
      const map: Record<string, string> = {
        delivered: 'email.delivered',
        opened: 'email.opened',
        clicked: 'email.clicked',
        failed: 'email.bounced',
        complained: 'email.complained',
        unsubscribed: 'email.unsubscribed',
      };
      const type = map[eventData.event ?? ''] ?? 'email.delivered';
      await handleResendWebhookEvent(sql, {
        type,
        data: {
          email_id: eventData.message.headers['message-id'],
          to: eventData.recipient ? [eventData.recipient] : undefined,
        },
      });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Webhook not supported for provider' }, { status: 400 });
}
