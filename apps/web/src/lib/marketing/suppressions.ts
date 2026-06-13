import type { AppSql } from '@/lib/db-sql';

export async function isEmailSuppressed(
  sql: AppSql,
  accountId: string,
  email: string
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM marketing_suppressions
    WHERE account_id = ${accountId}::uuid AND lower(email) = lower(${email})
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

export async function suppressEmail(
  sql: AppSql,
  accountId: string,
  email: string,
  reason = 'manual'
): Promise<void> {
  await sql`
    INSERT INTO marketing_suppressions (account_id, email, reason)
    VALUES (${accountId}::uuid, lower(${email.trim()}), ${reason})
    ON CONFLICT (account_id, email) DO NOTHING
  `;
  await sql`
    UPDATE contacts SET marketing_status = 'unsubscribed', marketing_unsubscribed_at = NOW(), updated_at = NOW()
    WHERE account_id = ${accountId}::uuid AND lower(email) = lower(${email})
  `;
}
