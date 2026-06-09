import { eq, sql } from 'drizzle-orm';
import { db, conversations, messages, contacts } from '../db/index.js';
import { publishEvent } from './redis.js';

export type MessageRow = {
  id: string;
  conversationId: string;
  accountId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  createdAt: Date;
};

export async function insertMessage(params: {
  conversationId: string;
  accountId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  incrementUnread?: boolean;
}): Promise<MessageRow> {
  const preview = params.content.slice(0, 200);
  const now = new Date();

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: params.conversationId,
      accountId: params.accountId,
      content: params.content,
      senderType: params.senderType,
      senderId: params.senderId,
    })
    .returning();

  if (!message) throw new Error('Failed to create message');

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastMessagePreview: preview,
      updatedAt: now,
      unreadCount: params.incrementUnread
        ? sql`${conversations.unreadCount} + 1`
        : conversations.unreadCount,
    })
    .where(eq(conversations.id, params.conversationId));

  if (params.senderType === 'contact') {
    await db
      .update(contacts)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(contacts.id, params.senderId!));
  }

  const payload = {
    type: 'message_created',
    conversationId: params.conversationId,
    accountId: params.accountId,
    message: {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      senderType: message.senderType,
      senderId: message.senderId,
      createdAt: message.createdAt.toISOString(),
    },
  };

  await publishEvent(`account:${params.accountId}`, payload);
  await publishEvent(`conversation:${params.conversationId}`, payload);

  return message;
}

export function serializeMessage(m: MessageRow) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    content: m.content,
    senderType: m.senderType,
    senderId: m.senderId,
    createdAt: m.createdAt.toISOString(),
  };
}
