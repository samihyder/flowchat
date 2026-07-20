import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  insertMessage,
  loadMessageAttachments,
  markMessagesRead,
  serializeMessage,
} from '@/lib/conversations';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const url = new URL(req.url);
  const before = url.searchParams.get('before');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT), MAX_LIMIT);

  const sql = neon(databaseUrl) as AppSql;
  const conv = await sql`
    SELECT id FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!conv[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  let rows;
  if (before) {
    const [cursorAt, cursorId] = before.split('|');
    rows = await sql`
      SELECT m.id, m.conversation_id as "conversationId", m.content,
             m.sender_type as "senderType", m.sender_id as "senderId",
             m.is_private as "isPrivate", m.client_message_id as "clientMessageId",
             m.edited_at as "editedAt", m.deleted_at as "deletedAt",
             m.created_at as "createdAt",
             r.read_at as "readAt"
      FROM messages m
      LEFT JOIN message_reads r ON r.message_id = m.id
        AND r.reader_type = 'agent' AND r.reader_id = ${auth.userId}::uuid
      WHERE m.conversation_id = ${conversationId}::uuid
        AND (m.created_at, m.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid)
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit}
    `;
    rows = [...rows].reverse();
  } else {
    rows = await sql`
      SELECT m.id, m.conversation_id as "conversationId", m.content,
             m.sender_type as "senderType", m.sender_id as "senderId",
             m.is_private as "isPrivate", m.client_message_id as "clientMessageId",
             m.edited_at as "editedAt", m.deleted_at as "deletedAt",
             m.created_at as "createdAt",
             r.read_at as "readAt"
      FROM messages m
      LEFT JOIN message_reads r ON r.message_id = m.id
        AND r.reader_type = 'agent' AND r.reader_id = ${auth.userId}::uuid
      WHERE m.conversation_id = ${conversationId}::uuid
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit}
    `;
    rows = [...rows].reverse();
  }

  const ids = (rows as { id: string }[]).map((r) => r.id);
  const attMap = await loadMessageAttachments(sql, ids);
  const messages = (rows as Parameters<typeof serializeMessage>[0][]).map((m) =>
    serializeMessage(m, attMap.get(m.id) ?? [])
  );

  const oldest = messages[0];
  const nextCursor =
    messages.length === limit && oldest
      ? `${oldest.createdAt}|${oldest.id}`
      : null;

  void markMessagesRead(sql, conversationId, 'agent', auth.userId);

  return Response.json({ messages, nextCursor });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    content?: string;
    isPrivate?: boolean;
    clientMessageId?: string;
    attachments?: {
      storageKey: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      publicUrl?: string | null;
    }[];
  };
  if (!body.content?.trim()) return Response.json({ error: 'Content is required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const conv = await sql`
    SELECT id FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!conv[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  const message = await insertMessage({
    conversationId,
    accountId,
    content: body.content.trim(),
    senderType: 'agent',
    senderId: auth.userId,
    incrementUnread: false,
    isPrivate: body.isPrivate ?? false,
    clientMessageId: body.clientMessageId ?? null,
    attachments: body.attachments,
    sql,
  });

  return Response.json({ message }, { status: 201 });
}
