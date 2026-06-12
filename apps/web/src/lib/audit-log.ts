import type { AppSql } from '@/lib/db-sql';

export async function writeAuditLog(
  sql: AppSql,
  entry: {
    accountId: string;
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await sql`
    INSERT INTO audit_logs (account_id, actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      ${entry.accountId}::uuid,
      ${entry.actorId ?? null}::uuid,
      ${entry.action},
      ${entry.resourceType},
      ${entry.resourceId ?? null},
      ${JSON.stringify(entry.metadata ?? {})}::jsonb
    )
  `;
}
