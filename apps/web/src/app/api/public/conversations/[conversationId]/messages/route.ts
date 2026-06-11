import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { insertMessage } from '@/lib/conversations';
import { guardPublicInboxRequest } from '@/lib/public-inbox-guard';
import { maybeSendOfflineAutoReply } from '@/lib/offline-reply';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ conversationId: string }> };

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

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT id, conversation_id as "conversationId", content,
           sender_type as "senderType", sender_id as "senderId",
           created_at as "createdAt"
    FROM messages WHERE conversation_id = ${conversationId}::uuid
    ORDER BY created_at ASC
  `;

  const messages = rows.map((m) => ({
    ...m,
    createdAt: new Date((m as { createdAt: Date | string }).createdAt).toISOString(),
  }));

  return Response.json({ messages }, { headers: corsHeaders() });
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

  const body = (await req.json()) as { content?: string };
  if (!body.content?.trim()) {
    return Response.json({ error: 'Content is required' }, { status: 400, headers: corsHeaders() });
  }

  const message = await insertMessage({
    conversationId,
    accountId: ctx.accountId,
    content: body.content.trim(),
    senderType: 'contact',
    senderId: ctx.contactId,
    incrementUnread: true,
  });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  void maybeSendOfflineAutoReply(sql, conversationId, ctx.accountId);

  return Response.json({ message }, { status: 201, headers: corsHeaders() });
}
