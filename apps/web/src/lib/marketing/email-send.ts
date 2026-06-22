import type { AccountSettings } from '@/lib/account-settings';
import { checkEmailDomain, sendViaEmailProvider } from '@/lib/credentials/providers/email';
import {
  markCredentialUsed,
  resolveEmailCredential,
} from '@/lib/credentials/store';
import type { EmailProviderId } from '@/lib/credentials/types';
import { buildMarketingEmailAppendix } from '@/lib/marketing/email-appendix';
import type { MergeContact } from '@/lib/marketing/merge-tags';
import { getOrCreateUnsubscribeToken, unsubscribeUrl } from '@/lib/marketing/unsubscribe';
import { getMarketingSender, senderFromHeader, type SenderIdentity } from '@/lib/marketing/senders';
import type { AppSql } from '@/lib/db-sql';

export type MarketingSendResult =
  | { ok: true; messageId: string; provider: EmailProviderId; credentialId?: string }
  | { ok: false; error: string };

function complianceFooter(physicalAddress: string | undefined, unsubscribeLink: string): string {
  const address = physicalAddress?.trim() || 'FlowChat';
  return `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#6b7280;line-height:1.5">
      ${address}<br />
      <a href="${unsubscribeLink}" style="color:#6b7280">Unsubscribe</a> from marketing emails.
    </p>
  `;
}

async function sendWithPlatformResend(
  sender: SenderIdentity,
  opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  }
): Promise<MarketingSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'No tenant email connection and RESEND_API_KEY not configured' };

  const result = await sendViaEmailProvider(
    'resend',
    apiKey,
    {},
    {
      from: senderFromHeader(sender),
      replyTo: sender.replyTo,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: opts.headers,
    }
  );
  if (!result.ok) return result;
  return { ok: true, messageId: result.messageId, provider: 'resend' };
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
    sender?: SenderIdentity;
    senderId?: string | null;
    credentialId?: string | null;
    skipComplianceFooter?: boolean;
    skipAutoAppendix?: boolean;
    mergeContact?: MergeContact;
    isTest?: boolean;
  }
): Promise<MarketingSendResult> {
  const senderRow = await getMarketingSender(sql, accountId, settings, opts.senderId);
  const sender = opts.sender ?? senderRow.identity;
  const credentialId = opts.credentialId ?? senderRow.credentialId ?? null;

  const unsub = opts.isTest
    ? '#'
    : unsubscribeUrl(await getOrCreateUnsubscribeToken(sql, accountId, contactId));

  let html = opts.html;
  if (!opts.skipAutoAppendix && opts.mergeContact) {
    const appendix = buildMarketingEmailAppendix(settings, opts.mergeContact, {
      senderName: sender.fromName,
    });
    if (appendix) html = `${html}${appendix}`;
  }

  html = opts.skipComplianceFooter ? html : `${html}${complianceFooter(sender.physicalAddress, unsub)}`;
  const text =
    opts.text ??
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const headers: Record<string, string> =
    opts.skipComplianceFooter || opts.isTest
      ? {}
      : {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        };

  const payload = {
    from: senderFromHeader(sender),
    replyTo: sender.replyTo,
    to: opts.to,
    subject: opts.subject,
    html,
    text,
    headers: Object.keys(headers).length ? headers : undefined,
  };

  const byokOnly = settings.marketingByokOnly === true;
  const cred = await resolveEmailCredential(sql, accountId, credentialId);

  if (cred) {
    const provider = cred.row.provider as EmailProviderId;
    const result = await sendViaEmailProvider(provider, cred.secret, cred.row.config, payload);
    if (result.ok) {
      await markCredentialUsed(sql, cred.row.id);
      return { ok: true, messageId: result.messageId, provider, credentialId: cred.row.id };
    }
    return result;
  }

  if (byokOnly) {
    return {
      ok: false,
      error: 'This workspace requires a connected email provider. Add one in Settings → Connected services.',
    };
  }

  return sendWithPlatformResend(sender, payload);
}
