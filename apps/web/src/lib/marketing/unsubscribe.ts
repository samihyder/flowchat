import { createId } from '@paralleldrive/cuid2';
import type { AppSql } from '@/lib/db-sql';
import { getWebAppOrigin } from '@/lib/marketing/origin';
import { suppressEmail } from '@/lib/marketing/suppressions';

export async function getOrCreateUnsubscribeToken(
  sql: AppSql,
  accountId: string,
  contactId: string
): Promise<string> {
  const existing = await sql`
    SELECT token FROM marketing_unsubscribe_tokens
    WHERE account_id = ${accountId}::uuid AND contact_id = ${contactId}::uuid
    LIMIT 1
  `;
  if ((existing[0] as { token: string } | undefined)?.token) {
    return (existing[0] as { token: string }).token;
  }

  const token = createId();
  await sql`
    INSERT INTO marketing_unsubscribe_tokens (token, account_id, contact_id)
    VALUES (${token}, ${accountId}::uuid, ${contactId}::uuid)
    ON CONFLICT (token) DO NOTHING
  `;
  return token;
}

export function unsubscribeUrl(token: string): string {
  return `${getWebAppOrigin()}/unsubscribe/${token}`;
}

export async function unsubscribeByToken(sql: AppSql, token: string): Promise<boolean> {
  const rows = await sql`
    SELECT t.account_id as "accountId", t.contact_id as "contactId", c.email
    FROM marketing_unsubscribe_tokens t
    INNER JOIN contacts c ON c.id = t.contact_id
    WHERE t.token = ${token} LIMIT 1
  `;
  const row = rows[0] as { accountId: string; contactId: string; email: string } | undefined;
  if (!row) return false;

  await sql`
    UPDATE contacts SET
      marketing_status = 'unsubscribed',
      marketing_unsubscribed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${row.contactId}::uuid AND account_id = ${row.accountId}::uuid
  `;

  if (row.email) {
    await suppressEmail(sql, row.accountId, row.email, 'unsubscribe');
  }

  await sql`
    INSERT INTO contact_email_events (account_id, contact_id, event_type, subject, metadata)
    VALUES (
      ${row.accountId}::uuid,
      ${row.contactId}::uuid,
      'unsubscribed',
      NULL,
      ${JSON.stringify({ source: 'unsubscribe_link' })}::jsonb
    )
  `;

  return true;
}
