import type { AccountSettings } from '@/lib/account-settings';
import { getOrCreateUnsubscribeToken, unsubscribeUrl } from '@/lib/marketing/unsubscribe';
import type { AppSql } from '@/lib/db-sql';

export type MarketingSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

function marketingFrom(settings: AccountSettings): string {
  const name = settings.marketingFromName?.trim() || 'FlowChat';
  const email =
    settings.marketingFromEmail?.trim() ||
    process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ||
    process.env.RESEND_FROM_EMAIL ||
    'onboarding@resend.dev';
  return `${name} <${email}>`;
}

function complianceFooter(settings: AccountSettings, unsubscribeLink: string): string {
  const address = settings.marketingPhysicalAddress?.trim() || 'FlowChat';
  return `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#6b7280;line-height:1.5">
      ${address}<br />
      <a href="${unsubscribeLink}" style="color:#6b7280">Unsubscribe</a> from marketing emails.
    </p>
  `;
}

export async function sendMarketingEmail(
  sql: AppSql,
  accountId: string,
  contactId: string,
  settings: AccountSettings,
  opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }
): Promise<MarketingSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };

  const token = await getOrCreateUnsubscribeToken(sql, accountId, contactId);
  const unsub = unsubscribeUrl(token);
  const html = `${opts.html}${complianceFooter(settings, unsub)}`;
  const text =
    opts.text ??
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const headers: Record<string, string> = {
    'List-Unsubscribe': `<${unsub}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: marketingFrom(settings),
        reply_to: settings.marketingReplyTo?.trim() || undefined,
        to: [opts.to],
        subject: opts.subject,
        html,
        text,
        headers,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message ?? `Resend error ${res.status}` };
    }
    return { ok: true, messageId: data.id ?? '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}
