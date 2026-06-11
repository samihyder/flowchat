import type { AppSql } from '@/lib/db-sql';

/** Delete visitor contacts inactive beyond retention window (GDPR housekeeping). */
export async function purgeExpiredVisitorData(sql: AppSql, accountId: string, retentionDays: number) {
  if (retentionDays < 30) return 0;

  const rows = (await sql`
    DELETE FROM contacts
    WHERE account_id = ${accountId}::uuid
      AND type = 'visitor'
      AND is_blocked = false
      AND (last_activity_at IS NULL OR last_activity_at < NOW() - (${retentionDays} || ' days')::interval)
      AND id NOT IN (
        SELECT DISTINCT contact_id FROM conversations
        WHERE account_id = ${accountId}::uuid AND status IN ('open', 'pending', 'snoozed')
      )
    RETURNING id
  `) as { id: string }[];

  return rows.length;
}
