import { randomBytes } from 'node:crypto';
import type { AppSql } from '@/lib/db-sql';
import { getWebAppOrigin } from '@/lib/marketing/origin';
import { sendMarketingEmail } from '@/lib/marketing/email-send';
import type { AccountSettings } from '@/lib/account-settings';
import { getMarketingSender } from '@/lib/marketing/senders';

export function confirmSubscribeUrl(token: string): string {
  return `${getWebAppOrigin()}/confirm-subscribe/${token}`;
}

export async function createConfirmToken(sql: AppSql, accountId: string, contactId: string): Promise<string> {
  const token = randomBytes(24).toString('hex');
  await sql`
    INSERT INTO marketing_confirm_tokens (token, account_id, contact_id)
    VALUES (${token}, ${accountId}::uuid, ${contactId}::uuid)
    ON CONFLICT (token) DO NOTHING
  `;
  return token;
}

export async function sendDoubleOptInEmail(
  sql: AppSql,
  accountId: string,
  contactId: string,
  settings: AccountSettings,
  opts: { to: string; name: string; senderId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const token = await createConfirmToken(sql, accountId, contactId);
  const link = confirmSubscribeUrl(token);
  const sender = await getMarketingSender(sql, accountId, settings, opts.senderId);

  const html = `
    <p>Hi ${opts.name || 'there'},</p>
    <p>Please confirm your subscription to receive marketing emails from us.</p>
    <p><a href="${link}">Confirm subscription</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  const result = await sendMarketingEmail(sql, accountId, contactId, settings, {
    to: opts.to,
    subject: 'Confirm your subscription',
    html,
    sender,
    skipComplianceFooter: true,
  });

  if (result.ok) {
    await sql`
      UPDATE contacts SET marketing_status = 'pending', updated_at = NOW()
      WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    `;
    return { ok: true };
  }
  return { ok: false, error: result.error };
}

export async function confirmSubscription(sql: AppSql, token: string): Promise<boolean> {
  const rows = await sql`
    SELECT account_id as "accountId", contact_id as "contactId", confirmed_at as "confirmedAt"
    FROM marketing_confirm_tokens WHERE token = ${token} LIMIT 1
  `;
  const row = rows[0] as { accountId: string; contactId: string; confirmedAt: Date | null } | undefined;
  if (!row || row.confirmedAt) return false;

  await sql`
    UPDATE contacts SET marketing_status = 'subscribed', updated_at = NOW()
    WHERE id = ${row.contactId}::uuid
  `;
  await sql`
    UPDATE marketing_confirm_tokens SET confirmed_at = NOW() WHERE token = ${token}
  `;
  await sql`
    INSERT INTO contact_email_events (account_id, contact_id, event_type, subject, metadata)
    VALUES (${row.accountId}::uuid, ${row.contactId}::uuid, 'subscribed', 'Double opt-in confirmed', '{}'::jsonb)
  `;
  return true;
}
