import type { AppSql } from '@/lib/db-sql';

export type DasNotifyInput = {
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  excludeUserId?: string | null;
};

/** Notify all active administrators on the account. */
export async function notifyAccountAdmins(
  sql: AppSql,
  accountId: string,
  input: DasNotifyInput
) {
  const admins = await sql`
    SELECT au.user_id as "userId"
    FROM account_users au
    WHERE au.account_id = ${accountId}::uuid
      AND au.role = 'administrator'
      AND au.status = 'active'
      AND (
        ${input.excludeUserId ?? null}::uuid IS NULL
        OR au.user_id <> ${input.excludeUserId ?? null}::uuid
      )
  `;

  for (const row of admins) {
    const userId = (row as { userId: string }).userId;
    await sql`
      INSERT INTO das_notifications (
        account_id,
        user_id,
        type,
        title,
        body,
        entity_type,
        entity_id
      )
      VALUES (
        ${accountId}::uuid,
        ${userId}::uuid,
        ${input.type},
        ${input.title},
        ${input.body ?? null},
        ${input.entityType ?? null},
        ${input.entityId ?? null}::uuid
      )
    `;
  }
}

/** Notify a single user (e.g. document creator on approve/reject). */
export async function notifyUser(
  sql: AppSql,
  accountId: string,
  userId: string,
  input: Omit<DasNotifyInput, 'excludeUserId'>
) {
  await sql`
    INSERT INTO das_notifications (
      account_id,
      user_id,
      type,
      title,
      body,
      entity_type,
      entity_id
    )
    VALUES (
      ${accountId}::uuid,
      ${userId}::uuid,
      ${input.type},
      ${input.title},
      ${input.body ?? null},
      ${input.entityType ?? null},
      ${input.entityId ?? null}::uuid
    )
  `;
}
