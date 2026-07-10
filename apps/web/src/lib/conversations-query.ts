import type { AppSql } from '@/lib/db-sql';

export type ConversationFilters = {
  accountId: string;
  status: string;
  inboxId?: string | null;
  assigneeId?: string | null;
  unassigned?: boolean;
  priority?: string | null;
  labelId?: string | null;
  from?: string | null;
  to?: string | null;
  agentUserId?: string | null;
  agentRole?: string;
  teamId?: string | null;
};

export async function unsnoozeExpired(sql: AppSql, accountId: string) {
  await sql`
    UPDATE conversations SET status = 'open', snoozed_until = NULL, updated_at = NOW()
    WHERE account_id = ${accountId}::uuid
      AND status = 'snoozed'
      AND snoozed_until IS NOT NULL
      AND snoozed_until <= NOW()
  `;
}

export async function listConversations(sql: AppSql, filters: ConversationFilters) {
  const {
    accountId,
    status,
    inboxId = null,
    assigneeId = null,
    unassigned = false,
    priority = null,
    labelId = null,
    from = null,
    to = null,
    agentUserId = null,
    agentRole = 'administrator',
    teamId = null,
  } = filters;

  await unsnoozeExpired(sql, accountId);

  const agentScoped = agentRole !== 'administrator' && !!agentUserId;

  return sql`
    SELECT c.id, c.inbox_id as "inboxId", c.contact_id as "contactId",
           c.status, c.priority, c.assignee_id as "assigneeId",
           c.snoozed_until as "snoozedUntil",
           c.last_message_at as "lastMessageAt",
           c.last_message_preview as "lastMessagePreview",
           c.unread_count as "unreadCount", c.created_at as "createdAt",
           ct.name as "contactName", ct.email as "contactEmail",
           i.name as "inboxName",
           u.name as "assigneeName",
           COALESCE(
             (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color))
              FROM conversation_labels cl
              INNER JOIN labels l ON l.id = cl.label_id
              WHERE cl.conversation_id = c.id),
             '[]'::json
           ) as labels
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    LEFT JOIN users u ON u.id = c.assignee_id
    WHERE c.account_id = ${accountId}::uuid
      AND c.status = ${status}
      AND (${inboxId}::uuid IS NULL OR c.inbox_id = ${inboxId}::uuid)
      AND (${teamId}::uuid IS NULL OR c.team_id = ${teamId}::uuid)
      AND (${assigneeId}::uuid IS NULL OR c.assignee_id = ${assigneeId}::uuid)
      AND (${unassigned}::boolean = false OR c.assignee_id IS NULL)
      AND (${priority}::text IS NULL OR c.priority::text = ${priority})
      AND (
        ${labelId}::uuid IS NULL
        OR EXISTS (
          SELECT 1 FROM conversation_labels cl
          WHERE cl.conversation_id = c.id AND cl.label_id = ${labelId}::uuid
        )
      )
      AND (
        ${agentScoped}::boolean = false
        OR c.inbox_id IN (SELECT inbox_id FROM inbox_members WHERE user_id = ${agentUserId}::uuid)
        OR c.inbox_id IN (SELECT id FROM inboxes WHERE default_assignee_id = ${agentUserId}::uuid)
        OR c.assignee_id = ${agentUserId}::uuid
      )
      AND (${from}::timestamptz IS NULL OR c.last_message_at >= ${from}::timestamptz)
      AND (${to}::timestamptz IS NULL OR c.last_message_at <= ${to}::timestamptz)
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    LIMIT 200
  `;
}
