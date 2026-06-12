import type { AppSql } from '@/lib/db-sql';
import { parseAccountSettings, type AccountSettings } from '@/lib/account-settings';

export async function getAccountSettings(sql: AppSql, accountId: string): Promise<AccountSettings> {
  const rows = await sql`
    SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1
  `;
  return parseAccountSettings((rows[0] as { settings: unknown } | undefined)?.settings);
}
