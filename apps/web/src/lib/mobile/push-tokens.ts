import type { AppSql } from '@/lib/db-sql';

export type DevicePushToken = {
  id: string;
  accountId: string;
  userId: string;
  platform: string;
  token: string;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  accountId: string;
  userId: string;
  platform: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: Row): DevicePushToken {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listPushTokens(
  sql: AppSql,
  accountId: string,
  userId: string
): Promise<DevicePushToken[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", user_id as "userId", platform, token,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM device_push_tokens
    WHERE account_id = ${accountId}::uuid AND user_id = ${userId}::uuid
    ORDER BY updated_at DESC
  `;
  return (rows as Row[]).map(serialize);
}

export async function registerPushToken(
  sql: AppSql,
  accountId: string,
  userId: string,
  input: { platform: string; token: string }
): Promise<DevicePushToken> {
  const rows = await sql`
    INSERT INTO device_push_tokens (account_id, user_id, platform, token)
    VALUES (${accountId}::uuid, ${userId}::uuid, ${input.platform}, ${input.token})
    ON CONFLICT (user_id, token) DO UPDATE SET
      platform = ${input.platform},
      account_id = ${accountId}::uuid,
      updated_at = NOW()
    RETURNING id, account_id as "accountId", user_id as "userId", platform, token,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serialize(rows[0] as Row);
}

export async function deletePushToken(
  sql: AppSql,
  accountId: string,
  userId: string,
  token: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM device_push_tokens
    WHERE account_id = ${accountId}::uuid
      AND user_id = ${userId}::uuid
      AND token = ${token}
    RETURNING id
  `;
  return rows.length > 0;
}
