import type { AccountSettings } from '@/lib/account-settings';
import { checkEmailDomain } from '@/lib/credentials/providers/email';
import { resolveEmailCredential } from '@/lib/credentials/store';
import type { EmailProviderId } from '@/lib/credentials/types';
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
  credentialId: string | null;
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

export type MarketingSenderResolved = {
  identity: SenderIdentity;
  credentialId: string | null;
};

export async function getMarketingSender(
  sql: AppSql,
  accountId: string,
  settings: AccountSettings,
  senderId?: string | null
): Promise<MarketingSenderResolved> {
  if (senderId) {
    const rows = await sql`
      SELECT from_name as "fromName", from_email as "fromEmail", reply_to as "replyTo",
             physical_address as "physicalAddress", credential_id as "credentialId"
      FROM marketing_senders
      WHERE id = ${senderId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    const row = rows[0] as (SenderIdentity & { credentialId?: string | null }) | undefined;
    if (row) {
      return { identity: row, credentialId: row.credentialId ?? null };
    }
  }

  const defaults = await sql`
    SELECT from_name as "fromName", from_email as "fromEmail", reply_to as "replyTo",
           physical_address as "physicalAddress", credential_id as "credentialId"
    FROM marketing_senders
    WHERE account_id = ${accountId}::uuid AND is_default = true
    LIMIT 1
  `;
  const def = defaults[0] as (SenderIdentity & { credentialId?: string | null }) | undefined;
  if (def) {
    return { identity: def, credentialId: def.credentialId ?? null };
  }

  return { identity: fallbackFromSettings(settings), credentialId: null };
}

export async function checkSenderDomainStatus(
  sql: AppSql,
  accountId: string,
  fromEmail: string,
  credentialId?: string | null
): Promise<'verified' | 'pending' | 'unknown' | 'failed'> {
  const cred = await resolveEmailCredential(sql, accountId, credentialId);
  if (cred) {
    return checkEmailDomain(
      cred.row.provider as EmailProviderId,
      cred.secret,
      cred.row.config,
      fromEmail
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 'unknown';
  return checkEmailDomain('resend', apiKey, {}, fromEmail);
}

/** @deprecated Use checkSenderDomainStatus */
export async function checkResendDomainStatus(fromEmail: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 'unknown' as const;
  return checkEmailDomain('resend', apiKey, {}, fromEmail);
}
