import { neon } from '@neondatabase/serverless';
import { publishEvent } from '@/lib/redis';
import { updateReplyTracking } from '@/lib/missed-chats';
import { writeAuditLog } from '@/lib/audit-log';
import { dispatchWebhooks } from '@/lib/webhooks';
import { triggerMarketingWorkflows } from '@/lib/marketing/workflow-triggers';
import type { AppSql } from '@/lib/db-sql';

export type MessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string | null;
};

export type SerializedMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  isPrivate: boolean;
  clientMessageId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  readAt: string | null;
  attachments: MessageAttachment[];
  createdAt: string;
};

type RawMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  isPrivate: boolean;
  clientMessageId: string | null;
  editedAt: Date | string | null;
  deletedAt: Date | string | null;
  readAt?: Date | string | null;
  createdAt: Date | string;
};

export function serializeMessage(row: RawMessage, attachments: MessageAttachment[] = []): SerializedMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    content: row.deletedAt ? '[Message deleted]' : row.content,
    senderType: row.senderType,
    senderId: row.senderId,
    isPrivate: row.isPrivate,
    clientMessageId: row.clientMessageId,
    editedAt: row.editedAt ? new Date(row.editedAt).toISOString() : null,
    deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    attachments,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function loadMessageAttachments(
  sql: AppSql,
  messageIds: string[]
): Promise<Map<string, MessageAttachment[]>> {
  const map = new Map<string, MessageAttachment[]>();
  if (messageIds.length === 0) return map;

  const rows = await sql`
    SELECT id, message_id as "messageId", filename, content_type as "contentType",
           size_bytes as "sizeBytes", public_url as "publicUrl"
    FROM message_attachments
    WHERE message_id = ANY(${messageIds}::uuid[])
    ORDER BY created_at ASC
  `;

  for (const row of rows as (MessageAttachment & { messageId: string })[]) {
    const list = map.get(row.messageId) ?? [];
    list.push({
      id: row.id,
      filename: row.filename,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      publicUrl: row.publicUrl,
    });
    map.set(row.messageId, list);
  }
  return map;
}

async function recordFirstResponse(
  sql: AppSql,
  conversationId: string,
  agentId: string | null
) {
  if (!agentId) return;
  await sql`
    UPDATE conversations SET
      first_response_at = COALESCE(first_response_at, NOW()),
      first_response_by = COALESCE(first_response_by, ${agentId}::uuid),
      updated_at = NOW()
    WHERE id = ${conversationId}::uuid AND first_response_at IS NULL
  `;
}

async function processMentions(
  sql: AppSql,
  accountId: string,
  messageId: string,
  content: string,
  authorId: string
) {
  const matches = content.match(/@([\w.-]+)/g);
  if (!matches) return;

  const handles = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  for (const handle of handles) {
    const users = await sql`
      SELECT u.id FROM users u
      INNER JOIN account_users au ON au.user_id = u.id
      WHERE au.account_id = ${accountId}::uuid
        AND au.membership_status = 'active'
        AND (
          LOWER(SPLIT_PART(u.email, '@', 1)) = ${handle}
          OR LOWER(REPLACE(u.name, ' ', '')) = ${handle}
        )
      LIMIT 1
    `;
    const mentioned = (users[0] as { id: string } | undefined)?.id;
    if (!mentioned || mentioned === authorId) continue;

    await sql`
      INSERT INTO message_mentions (message_id, mentioned_user_id)
      VALUES (${messageId}::uuid, ${mentioned}::uuid)
    `;

    void publishEvent(`account:${accountId}`, {
      type: 'mention',
      messageId,
      mentionedUserId: mentioned,
      authorId,
    });
  }
}

export type AttachmentInput = {
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  publicUrl?: string | null;
};

export async function insertMessage(params: {
  conversationId: string;
  accountId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  incrementUnread?: boolean;
  isPrivate?: boolean;
  clientMessageId?: string | null;
  attachments?: AttachmentInput[];
  sql?: AppSql;
}): Promise<SerializedMessage> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not configured');

  const sql = params.sql ?? (neon(databaseUrl) as AppSql);
  const preview = params.content.slice(0, 200);
  const isPrivate = params.isPrivate ?? false;

  if (params.clientMessageId) {
    const existing = await sql`
      SELECT id, conversation_id as "conversationId", content,
             sender_type as "senderType", sender_id as "senderId",
             is_private as "isPrivate", client_message_id as "clientMessageId",
             edited_at as "editedAt", deleted_at as "deletedAt", created_at as "createdAt"
      FROM messages
      WHERE conversation_id = ${params.conversationId}::uuid
        AND client_message_id = ${params.clientMessageId}
      LIMIT 1
    `;
    if (existing[0]) {
      const attMap = await loadMessageAttachments(sql, [(existing[0] as RawMessage).id]);
      return serializeMessage(existing[0] as RawMessage, attMap.get((existing[0] as RawMessage).id) ?? []);
    }
  }

  const rows = await sql`
    INSERT INTO messages (
      conversation_id, account_id, content, sender_type, sender_id,
      is_private, client_message_id
    )
    VALUES (
      ${params.conversationId}::uuid,
      ${params.accountId}::uuid,
      ${params.content},
      ${params.senderType},
      ${params.senderId ? params.senderId : null}::uuid,
      ${isPrivate},
      ${params.clientMessageId ?? null}
    )
    RETURNING id, conversation_id as "conversationId", content,
              sender_type as "senderType", sender_id as "senderId",
              is_private as "isPrivate", client_message_id as "clientMessageId",
              edited_at as "editedAt", deleted_at as "deletedAt",
              created_at as "createdAt"
  `;

  const message = rows[0] as RawMessage;
  if (!message) throw new Error('Failed to create message');

  const attachments: MessageAttachment[] = [];
  if (params.attachments?.length) {
    const slice = params.attachments.slice(0, 15);
    for (const att of slice) {
      const attRows = await sql`
        INSERT INTO message_attachments (
          message_id, account_id, filename, content_type, size_bytes, storage_key, public_url
        )
        VALUES (
          ${message.id}::uuid,
          ${params.accountId}::uuid,
          ${att.filename},
          ${att.contentType},
          ${att.sizeBytes},
          ${att.storageKey},
          ${att.publicUrl ?? null}
        )
        RETURNING id, filename, content_type as "contentType",
                  size_bytes as "sizeBytes", public_url as "publicUrl"
      `;
      const row = attRows[0] as MessageAttachment;
      if (row) attachments.push(row);
    }
  }

  if (!isPrivate) {
    await updateReplyTracking(sql, params.conversationId, params.senderType);
  }

  if (params.senderType === 'agent' && !isPrivate) {
    await recordFirstResponse(sql, params.conversationId, params.senderId);
  }

  if (isPrivate && params.senderId) {
    void processMentions(sql, params.accountId, message.id, params.content, params.senderId);
  }

  if (params.incrementUnread) {
    await sql`
      UPDATE conversations SET
        last_message_at = NOW(),
        last_message_preview = ${preview},
        unread_count = unread_count + 1,
        updated_at = NOW()
      WHERE id = ${params.conversationId}::uuid
    `;
    if (params.senderId) {
      await sql`
        UPDATE contacts SET last_activity_at = NOW(), updated_at = NOW()
        WHERE id = ${params.senderId}::uuid
      `;
    }
  } else if (!isPrivate) {
    await sql`
      UPDATE conversations SET
        last_message_at = NOW(),
        last_message_preview = ${preview},
        updated_at = NOW()
      WHERE id = ${params.conversationId}::uuid
    `;
  }

  const serialized = serializeMessage(message, attachments);

  const payload = {
    type: 'message_created' as const,
    conversationId: params.conversationId,
    accountId: params.accountId,
    message: serialized,
  };

  void publishEvent(`account:${params.accountId}`, payload);
  if (!isPrivate) {
    void publishEvent(`conversation:${params.conversationId}`, payload);
  }

  if (!isPrivate) {
    void dispatchWebhooks(sql, params.accountId, 'message.created', {
      conversationId: params.conversationId,
      message: serialized,
    });
  }

  return serialized;
}

export async function markMessagesRead(
  sql: AppSql,
  conversationId: string,
  readerType: 'agent' | 'contact',
  readerId: string | null
) {
  const senderType = readerType === 'agent' ? 'contact' : 'agent';
  await sql`
    INSERT INTO message_reads (message_id, reader_type, reader_id, read_at)
    SELECT m.id, ${readerType}, ${readerId}::uuid, NOW()
    FROM messages m
    WHERE m.conversation_id = ${conversationId}::uuid
      AND m.sender_type = ${senderType}
      AND m.is_private = false
      AND m.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM message_reads r
        WHERE r.message_id = m.id AND r.reader_type = ${readerType}
          AND (r.reader_id = ${readerId}::uuid OR (r.reader_id IS NULL AND ${readerId}::uuid IS NULL))
      )
    ON CONFLICT (message_id, reader_type, reader_id) DO UPDATE SET read_at = COALESCE(message_reads.read_at, NOW())
  `;

  void publishEvent(`conversation:${conversationId}`, {
    type: 'messages_read',
    conversationId,
    readerType,
    readerId,
  });
}

export function newVisitorToken() {
  return `${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`;
}

export async function logConversationResolved(
  sql: AppSql,
  accountId: string,
  conversationId: string,
  actorId: string
) {
  await sql`
    UPDATE conversations SET resolved_at = NOW(), updated_at = NOW()
    WHERE id = ${conversationId}::uuid AND resolved_at IS NULL
  `;

  await writeAuditLog(sql, {
    accountId,
    actorId,
    action: 'conversation.resolved',
    resourceType: 'conversation',
    resourceId: conversationId,
  });

  void dispatchWebhooks(sql, accountId, 'conversation.resolved', { conversationId });

  const convRows = await sql`
    SELECT contact_id as "contactId" FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  const contactId = (convRows[0] as { contactId: string | null } | undefined)?.contactId;
  if (contactId) {
    await triggerMarketingWorkflows(sql, accountId, 'conversation_resolved', contactId);
  }
}
