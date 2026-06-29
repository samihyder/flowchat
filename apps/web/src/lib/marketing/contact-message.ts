import type { AppSql } from '@/lib/db-sql';
import type { ContactMessageMode } from '@/lib/marketing/campaign-step-draft';

type ResolvedSnippet = { text: string; source: 'note' | 'chat' | null; at: Date | null };

async function latestNote(
  sql: AppSql,
  accountId: string,
  contactId: string
): Promise<ResolvedSnippet> {
  const rows = await sql`
    SELECT content, created_at as "createdAt"
    FROM contact_notes
    WHERE contact_id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const row = rows[0] as { content: string; createdAt: Date } | undefined;
  if (!row?.content?.trim()) return { text: '', source: null, at: null };
  return { text: row.content.trim(), source: 'note', at: new Date(row.createdAt) };
}

async function latestInboundChat(
  sql: AppSql,
  accountId: string,
  contactId: string
): Promise<ResolvedSnippet> {
  const rows = await sql`
    SELECT m.content, m.created_at as "createdAt"
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    WHERE c.contact_id = ${contactId}::uuid
      AND c.account_id = ${accountId}::uuid
      AND m.sender_type = 'contact'
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  `;
  const row = rows[0] as { content: string; createdAt: Date } | undefined;
  if (!row?.content?.trim()) return { text: '', source: null, at: null };
  return { text: row.content.trim(), source: 'chat', at: new Date(row.createdAt) };
}

/** Resolve {{contact_message}} for a recipient at send time (S6M-19). */
export async function resolveContactMessage(
  sql: AppSql,
  accountId: string,
  contactId: string,
  mode: ContactMessageMode
): Promise<string> {
  const result = await resolveContactMessageDetail(sql, accountId, contactId, mode);
  return result.text;
}

export async function resolveContactMessageDetail(
  sql: AppSql,
  accountId: string,
  contactId: string,
  mode: ContactMessageMode
): Promise<ResolvedSnippet> {
  if (mode === 'latest_note') {
    return latestNote(sql, accountId, contactId);
  }
  if (mode === 'latest_inbound_chat') {
    return latestInboundChat(sql, accountId, contactId);
  }

  const [note, chat] = await Promise.all([
    latestNote(sql, accountId, contactId),
    latestInboundChat(sql, accountId, contactId),
  ]);
  if (!note.at && !chat.at) return { text: '', source: null, at: null };
  if (!chat.at) return note;
  if (!note.at) return chat;
  return note.at >= chat.at ? note : chat;
}
