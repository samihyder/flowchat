import type { AccountSettings } from '@/lib/account-settings';
import type { AppSql } from '@/lib/db-sql';

export type MarketingSender = {
  id: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  physicalAddress: string | null;
  isDefault: boolean;
  domainStatus: string;
};

export type SenderIdentity = {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  physicalAddress?: string;
};

export function senderFromHeader(sender: SenderIdentity): string {
  return `${sender.fromName.trim() || 'FlowChat'} <${sender.fromEmail.trim()}>`;
}

function fallbackFromSettings(settings: AccountSettings): SenderIdentity {
  const email =
    settings.marketingFromEmail?.trim() ||
    process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ||
    process.env.RESEND_FROM_EMAIL ||
    'onboarding@resend.dev';
  return {
    fromName: settings.marketingFromName?.trim() || 'FlowChat',
    fromEmail: email,
    replyTo: settings.marketingReplyTo?.trim() || undefined,
    physicalAddress: settings.marketingPhysicalAddress?.trim() || undefined,
  };
}

export async function getMarketingSender(
  sql: AppSql,
  accountId: string,
  settings: AccountSettings,
  senderId?: string | null
): Promise<SenderIdentity> {
  if (senderId) {
    const rows = await sql`
      SELECT from_name as "fromName", from_email as "fromEmail", reply_to as "replyTo",
             physical_address as "physicalAddress"
      FROM marketing_senders
      WHERE id = ${senderId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    const row = rows[0] as SenderIdentity | undefined;
    if (row) return row;
  }

  const defaults = await sql`
    SELECT from_name as "fromName", from_email as "fromEmail", reply_to as "replyTo",
           physical_address as "physicalAddress"
    FROM marketing_senders
    WHERE account_id = ${accountId}::uuid AND is_default = true
    LIMIT 1
  `;
  const def = defaults[0] as SenderIdentity | undefined;
  if (def) return def;

  return fallbackFromSettings(settings);
}

export async function checkResendDomainStatus(fromEmail: string): Promise<'verified' | 'pending' | 'unknown' | 'failed'> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 'unknown';

  const domain = fromEmail.split('@')[1]?.toLowerCase();
  if (!domain) return 'unknown';

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return 'unknown';
    const data = (await res.json()) as { data?: { name: string; status: string }[] };
    const match = data.data?.find((d) => d.name === domain || domain.endsWith(`.${d.name}`));
    if (!match) return 'unknown';
    if (match.status === 'verified') return 'verified';
    if (match.status === 'failed' || match.status === 'not_started') return 'failed';
    return 'pending';
  } catch {
    return 'unknown';
  }
}
