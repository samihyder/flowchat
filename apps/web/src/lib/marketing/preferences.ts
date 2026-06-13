import type { AppSql } from '@/lib/db-sql';
import { suppressEmail } from '@/lib/marketing/suppressions';

export type MarketingPreference = 'all' | 'reduced' | 'none';

export async function setContactPreference(
  sql: AppSql,
  token: string,
  preference: MarketingPreference
): Promise<boolean> {
  const rows = await sql`
    SELECT t.account_id as "accountId", t.contact_id as "contactId", c.email
    FROM marketing_unsubscribe_tokens t
    INNER JOIN contacts c ON c.id = t.contact_id
    WHERE t.token = ${token} LIMIT 1
  `;
  const row = rows[0] as { accountId: string; contactId: string; email: string } | undefined;
  if (!row) return false;

  if (preference === 'none') {
    await sql`
      UPDATE contacts SET marketing_status = 'unsubscribed', marketing_preference = 'none',
        marketing_unsubscribed_at = NOW(), updated_at = NOW()
      WHERE id = ${row.contactId}::uuid
    `;
    if (row.email) await suppressEmail(sql, row.accountId, row.email, 'unsubscribe');
  } else if (preference === 'reduced') {
    await sql`
      UPDATE contacts SET marketing_status = 'subscribed', marketing_preference = 'reduced', updated_at = NOW()
      WHERE id = ${row.contactId}::uuid
    `;
  } else {
    await sql`
      UPDATE contacts SET marketing_status = 'subscribed', marketing_preference = 'all',
        marketing_unsubscribed_at = NULL, updated_at = NOW()
      WHERE id = ${row.contactId}::uuid
    `;
  }

  await sql`
    INSERT INTO contact_email_events (account_id, contact_id, event_type, metadata)
    VALUES (${row.accountId}::uuid, ${row.contactId}::uuid, 'preference_updated',
            ${JSON.stringify({ preference })}::jsonb)
  `;
  return true;
}
