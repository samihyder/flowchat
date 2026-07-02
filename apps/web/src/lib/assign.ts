import type { AppSql } from '@/lib/db-sql';

/**
 * Validate that assigneeId (if provided) is an active account member and teamId
 * (if provided) belongs to the account. Returns an error message, or null if valid.
 * Mirrors the eligibility rule used by pickRoundRobinAssignee (active membership +
 * active user), so a globally deactivated user can't be assigned via either path.
 */
export async function validateAssignment(
  sql: AppSql,
  accountId: string,
  target: { assigneeId?: string | null; teamId?: string | null }
): Promise<string | null> {
  if (target.assigneeId !== undefined && target.assigneeId !== null) {
    const member = await sql`
      SELECT 1 FROM account_users au
      INNER JOIN users u ON u.id = au.user_id
      WHERE au.account_id = ${accountId}::uuid AND au.user_id = ${target.assigneeId}::uuid
        AND au.status = 'active' AND u.is_active = true
      LIMIT 1
    `;
    if (!member[0]) return 'Assignee is not an active member of this account';
  }

  if (target.teamId !== undefined && target.teamId !== null) {
    const team = await sql`
      SELECT 1 FROM teams WHERE id = ${target.teamId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
    `;
    if (!team[0]) return 'Team not found';
  }

  return null;
}

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
