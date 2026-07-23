import { neon } from '@/lib/neon';
import { verifySvixWebhook } from '@/lib/credentials/webhook-signature';
import { handleResendWebhookEvent } from '@/lib/marketing/resend-events';
import type { AppSql } from '@/lib/db-sql';

/**
 * Platform Resend webhook (legacy). Requires RESEND_WEBHOOK_SECRET (whsec_…).
 * Prefer credential-scoped `/api/webhooks/email/[credentialId]` for BYOK accounts.
 */
export async function POST(req: Request) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET ?? '').trim();
  if (!secret) {
    return Response.json(
      {
        error:
          'Platform webhook disabled — set RESEND_WEBHOOK_SECRET or use /api/webhooks/email/[credentialId]',
      },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  if (!verifySvixWebhook(rawBody, req.headers, secret)) {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { type: string; data?: Record<string, unknown> };
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  await handleResendWebhookEvent(sql, body);
  return Response.json({ ok: true });
}
