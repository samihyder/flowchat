import type { AppSql } from '@/lib/db-sql';
import { publishEvent } from '@/lib/redis';
import { sendMissedChatEmail } from '@/lib/email';

export async function updateReplyTracking(
  sql: AppSql,
  conversationId: string,
  senderType: 'contact' | 'agent' | 'system'
) {
  if (senderType === 'contact') {
    await sql`
      UPDATE conversations SET
        awaiting_reply_since = NOW(),
        updated_at = NOW()
      WHERE id = ${conversationId}::uuid AND status = 'open'
    `;
  } else if (senderType === 'agent') {
    await sql`
      UPDATE conversations SET
        awaiting_reply_since = NULL,
        missed_alert_sent_at = NULL,
        updated_at = NOW()
      WHERE id = ${conversationId}::uuid
    `;
  }
}

type MissedRow = {
  id: string;
  contactName: string;
  inboxName: string;
  assigneeEmail: string | null;
  assigneeName: string | null;
  minutesWaiting: number;
};

/** Find unanswered chats past inbox threshold; notify agents once per episode. */
export async function processMissedChats(sql: AppSql, accountId: string): Promise<MissedRow[]> {
  const rows = (await sql`
    SELECT c.id,
           ct.name as "contactName",
           i.name as "inboxName",
           u.email as "assigneeEmail",
           u.name as "assigneeName",
           EXTRACT(EPOCH FROM (NOW() - c.awaiting_reply_since)) / 60 as "minutesWaiting"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    LEFT JOIN users u ON u.id = COALESCE(c.assignee_id, i.default_assignee_id)
    WHERE c.account_id = ${accountId}::uuid
      AND c.status = 'open'
      AND c.awaiting_reply_since IS NOT NULL
      AND c.missed_alert_sent_at IS NULL
      AND c.awaiting_reply_since < NOW() - (i.missed_chat_minutes || ' minutes')::interval
    LIMIT 20
  `) as MissedRow[];

  for (const row of rows) {
    await sql`
      UPDATE conversations SET missed_alert_sent_at = NOW(), updated_at = NOW()
      WHERE id = ${row.id}::uuid
    `;

    void publishEvent(`account:${accountId}`, {
      type: 'missed_chat',
      accountId,
      conversationId: row.id,
      contactName: row.contactName,
      inboxName: row.inboxName,
      minutesWaiting: Math.round(row.minutesWaiting),
    });

    if (row.assigneeEmail) {
      void sendMissedChatEmail(row.assigneeEmail, {
        contactName: row.contactName,
        inboxName: row.inboxName,
        minutesWaiting: Math.round(row.minutesWaiting),
        conversationId: row.id,
      });
    }
  }

  return rows;
}
