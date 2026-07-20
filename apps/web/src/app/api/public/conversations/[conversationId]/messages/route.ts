import { neon } from '@/lib/neon';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import {
  insertMessage,
  loadMessageAttachments,
  markMessagesRead,
  serializeMessage,
} from '@/lib/conversations';
import { guardPublicInboxRequest } from '@/lib/public-inbox-guard';
import { maybeSendOfflineAutoReply } from '@/lib/offline-reply';
import { maybeSendWidgetAiReply } from '@/lib/widget-ai-reply';
import { parseAccountSettings } from '@/lib/account-settings';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ conversationId: string }> };

const DEFAULT_LIMIT = 50;

async function resolveVisitor(conversationId: string, visitorToken: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT c.id as "conversationId", c.account_id as "accountId", c.contact_id as "contactId",
           c.inbox_id as "inboxId", ct.is_blocked as "isBlocked"
    FROM conversations c
    INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
    INNER JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = ${conversationId}::uuid AND ci.visitor_token = ${visitorToken}
    LIMIT 1
  `;
  return rows[0] as {
    conversationId: string;
    accountId: string;
    contactId: string;
    inboxId: string;
    isBlocked: boolean;
  } | undefined;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request, { params }: Params) {
  const { conversationId } = await params;
  const visitorToken = req.headers.get('X-Visitor-Token');
  if (!visitorToken) {
    return Response.json({ error: 'Missing visitor token' }, { status: 401, headers: corsHeaders() });
  }

  const ctx = await resolveVisitor(conversationId, visitorToken);
  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const before = url.searchParams.get('before');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT), 100);

  const sql = neon(databaseUrl) as AppSql;
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
        AND r.reader_type = 'contact' AND r.reader_id = ${ctx.contactId}::uuid
      WHERE m.conversation_id = ${conversationId}::uuid
        AND m.is_private = false
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
        AND r.reader_type = 'contact' AND r.reader_id = ${ctx.contactId}::uuid
      WHERE m.conversation_id = ${conversationId}::uuid AND m.is_private = false
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
    messages.length === limit && oldest ? `${oldest.createdAt}|${oldest.id}` : null;

  void markMessagesRead(sql, conversationId, 'contact', ctx.contactId);

  return Response.json({ messages, nextCursor }, { headers: corsHeaders() });
}

export async function POST(req: Request, { params }: Params) {
  const { conversationId } = await params;
  const visitorToken = req.headers.get('X-Visitor-Token');
  if (!visitorToken) {
    return Response.json({ error: 'Missing visitor token' }, { status: 401, headers: corsHeaders() });
  }

  const ctx = await resolveVisitor(conversationId, visitorToken);
  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }
  if (ctx.isBlocked) {
    return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders() });
  }

  const guard = await guardPublicInboxRequest(req, ctx.inboxId, 'message');
  if (!guard.ok) {
    const headers = { ...corsHeaders(), ...(guard.response.headers as Headers) };
    return new Response(guard.response.body, { status: guard.response.status, headers });
  }

  const body = (await req.json()) as { content?: string; clientMessageId?: string };
  if (!body.content?.trim()) {
    return Response.json({ error: 'Content is required' }, { status: 400, headers: corsHeaders() });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const message = await insertMessage({
    conversationId,
    accountId: ctx.accountId,
    content: body.content.trim(),
    senderType: 'contact',
    senderId: ctx.contactId,
    incrementUnread: true,
    clientMessageId: body.clientMessageId ?? null,
    sql,
  });

  const accountRows = await sql`SELECT settings FROM accounts WHERE id = ${ctx.accountId}::uuid LIMIT 1`;
  const settings = parseAccountSettings((accountRows[0] as { settings?: unknown } | undefined)?.settings);

  if (settings.widgetAiEnabled) {
    void maybeSendWidgetAiReply(sql, conversationId, ctx.accountId);
  } else {
    void maybeSendOfflineAutoReply(sql, conversationId, ctx.accountId);
  }

  return Response.json({ message }, { status: 201, headers: corsHeaders() });
}
