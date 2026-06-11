import type { AppSql } from '@/lib/db-sql';

/** Pick next agent for round-robin assignment on an inbox. */
export async function pickRoundRobinAssignee(
  sql: AppSql,
  inboxId: string,
  accountId: string
): Promise<string | null> {
  const members = await sql`
    SELECT au.user_id as "userId"
    FROM inbox_members im
    INNER JOIN account_users au ON au.user_id = im.user_id AND au.account_id = ${accountId}::uuid
    INNER JOIN users u ON u.id = au.user_id
    WHERE im.inbox_id = ${inboxId}::uuid
      AND au.status = 'active'
      AND u.is_active = true
    ORDER BY au.created_at ASC
  `;

  const ids = (members as { userId: string }[]).map((m) => m.userId);
  if (ids.length === 0) {
    const fallback = await sql`
      SELECT default_assignee_id as "userId" FROM inboxes
      WHERE id = ${inboxId}::uuid LIMIT 1
    `;
    return (fallback[0] as { userId: string } | undefined)?.userId ?? null;
  }

  const state = await sql`
    SELECT last_assignee_id as "lastId" FROM inbox_round_robin_state
    WHERE inbox_id = ${inboxId}::uuid LIMIT 1
  `;
  const lastId = (state[0] as { lastId: string | null } | undefined)?.lastId;
  const idx = lastId ? (ids.indexOf(lastId) + 1) % ids.length : 0;
  const nextId = ids[idx]!;

  await sql`
    INSERT INTO inbox_round_robin_state (inbox_id, last_assignee_id, updated_at)
    VALUES (${inboxId}::uuid, ${nextId}::uuid, NOW())
    ON CONFLICT (inbox_id) DO UPDATE SET last_assignee_id = ${nextId}::uuid, updated_at = NOW()
  `;

  return nextId;
}
