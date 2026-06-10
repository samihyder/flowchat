import { neon } from '@neondatabase/serverless';
import { publishEvent } from '@/lib/redis';

export type SerializedMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  createdAt: string;
};

export async function insertMessage(params: {
  conversationId: string;
  accountId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  incrementUnread?: boolean;
}): Promise<SerializedMessage> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not configured');

  const sql = neon(databaseUrl);
  const preview = params.content.slice(0, 200);

  const rows = await sql`
    INSERT INTO messages (conversation_id, account_id, content, sender_type, sender_id)
    VALUES (
      ${params.conversationId}::uuid,
      ${params.accountId}::uuid,
      ${params.content},
      ${params.senderType},
      ${params.senderId ? params.senderId : null}::uuid
    )
    RETURNING id, conversation_id as "conversationId", content,
              sender_type as "senderType", sender_id as "senderId",
              created_at as "createdAt"
  `;

  const message = rows[0] as {
    id: string;
    conversationId: string;
    content: string;
    senderType: 'contact' | 'agent' | 'system';
    senderId: string | null;
    createdAt: Date | string;
  };

  if (!message) throw new Error('Failed to create message');

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
  } else {
    await sql`
      UPDATE conversations SET
        last_message_at = NOW(),
        last_message_preview = ${preview},
        updated_at = NOW()
      WHERE id = ${params.conversationId}::uuid
    `;
  }

  const serialized: SerializedMessage = {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    senderType: message.senderType,
    senderId: message.senderId,
    createdAt: new Date(message.createdAt).toISOString(),
  };

  const payload = {
    type: 'message_created' as const,
    conversationId: params.conversationId,
    accountId: params.accountId,
    message: serialized,
  };

  await publishEvent(`account:${params.accountId}`, payload);
  await publishEvent(`conversation:${params.conversationId}`, payload);

  return serialized;
}

export function newVisitorToken() {
  return `${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`;
}
