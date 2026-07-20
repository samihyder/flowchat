import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { loadMessageAttachments, serializeMessage } from '@/lib/conversations';
import { writeAuditLog } from '@/lib/audit-log';
import { publishEvent } from '@/lib/redis';
import type { AppSql } from '@/lib/db-sql';

type Params = {
  params: Promise<{ accountId: string; conversationId: string; messageId: string }>;
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, conversationId, messageId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { content?: string };
  if (!body.content?.trim()) return Response.json({ error: 'Content is required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const existing = await sql`
    SELECT id, sender_id as "senderId", sender_type as "senderType",
           created_at as "createdAt", deleted_at as "deletedAt"
    FROM messages
    WHERE id = ${messageId}::uuid
      AND conversation_id = ${conversationId}::uuid
      AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = existing[0] as {
    senderId: string | null;
    senderType: string;
    createdAt: Date | string;
    deletedAt: Date | string | null;
  } | undefined;

  if (!row) return Response.json({ error: 'Message not found' }, { status: 404 });
  if (row.deletedAt) return Response.json({ error: 'Message was deleted' }, { status: 400 });
  if (row.senderType !== 'agent' || row.senderId !== auth.userId) {
    return Response.json({ error: 'You can only edit your own messages' }, { status: 403 });
  }

  const age = Date.now() - new Date(row.createdAt).getTime();
  if (age > EDIT_WINDOW_MS) {
    return Response.json({ error: 'Edit window expired (15 minutes)' }, { status: 400 });
  }

  const updated = await sql`
    UPDATE messages SET content = ${body.content.trim()}, edited_at = NOW()
    WHERE id = ${messageId}::uuid
    RETURNING id, conversation_id as "conversationId", content,
              sender_type as "senderType", sender_id as "senderId",
              is_private as "isPrivate", client_message_id as "clientMessageId",
              edited_at as "editedAt", deleted_at as "deletedAt", created_at as "createdAt"
  `;

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'message.edited',
    resourceType: 'message',
    resourceId: messageId,
    metadata: { conversationId },
  });

  const attMap = await loadMessageAttachments(sql, [messageId]);
  const message = serializeMessage(updated[0] as Parameters<typeof serializeMessage>[0], attMap.get(messageId) ?? []);

  void publishEvent(`account:${accountId}`, {
    type: 'message_updated',
    conversationId,
    accountId,
    message,
  });
  if (!message.isPrivate) {
    void publishEvent(`conversation:${conversationId}`, {
      type: 'message_updated',
      conversationId,
      accountId,
      message,
    });
  }

  return Response.json({ message });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, conversationId, messageId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const existing = await sql`
    SELECT id, sender_type as "senderType", deleted_at as "deletedAt", is_private as "isPrivate"
    FROM messages
    WHERE id = ${messageId}::uuid
      AND conversation_id = ${conversationId}::uuid
      AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = existing[0] as { senderType: string; deletedAt: Date | null; isPrivate: boolean } | undefined;
  if (!row) return Response.json({ error: 'Message not found' }, { status: 404 });
  if (row.deletedAt) return Response.json({ error: 'Already deleted' }, { status: 400 });
  if (row.senderType !== 'agent') {
    return Response.json({ error: 'Only agent messages can be deleted' }, { status: 403 });
  }

  const updated = await sql`
    UPDATE messages SET deleted_at = NOW(), deleted_by = ${auth.userId}::uuid
    WHERE id = ${messageId}::uuid
    RETURNING id, conversation_id as "conversationId", content,
              sender_type as "senderType", sender_id as "senderId",
              is_private as "isPrivate", client_message_id as "clientMessageId",
              edited_at as "editedAt", deleted_at as "deletedAt", created_at as "createdAt"
  `;

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'message.deleted',
    resourceType: 'message',
    resourceId: messageId,
    metadata: { conversationId },
  });

  const message = serializeMessage(updated[0] as Parameters<typeof serializeMessage>[0]);

  void publishEvent(`account:${accountId}`, {
    type: 'message_updated',
    conversationId,
    accountId,
    message,
  });
  if (!row.isPrivate) {
    void publishEvent(`conversation:${conversationId}`, {
      type: 'message_updated',
      conversationId,
      accountId,
      message,
    });
  }

  return Response.json({ message });
}
