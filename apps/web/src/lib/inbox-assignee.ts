import type { NeonQueryFunction } from '@neondatabase/serverless';

export async function isAccountAgent(
  sql: NeonQueryFunction<false, false>,
  accountId: string,
  userId: string
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM account_users au
    INNER JOIN users u ON u.id = au.user_id
    WHERE au.account_id = ${accountId}::uuid
      AND au.user_id = ${userId}::uuid
      AND u.is_active = true
    LIMIT 1
  `;
  return rows.length > 0;
}
