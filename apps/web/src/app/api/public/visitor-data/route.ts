import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';

export async function OPTIONS() {
  return optionsResponse();
}

async function resolveVisitor(conversationId: string, visitorToken: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT c.id as "conversationId", c.contact_id as "contactId", c.account_id as "accountId"
    FROM conversations c
    INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
    WHERE c.id = ${conversationId}::uuid AND ci.visitor_token = ${visitorToken}
    LIMIT 1
  `;
  return rows[0] as { conversationId: string; contactId: string; accountId: string } | undefined;
}

/** GDPR: export visitor data for a conversation. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversationId');
  const visitorToken = req.headers.get('X-Visitor-Token');
  if (!conversationId || !visitorToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const ctx = await resolveVisitor(conversationId, visitorToken);
  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const contact = await sql`
    SELECT name, email, phone, created_at as "createdAt"
    FROM contacts WHERE id = ${ctx.contactId}::uuid LIMIT 1
  `;
  const messages = await sql`
    SELECT content, sender_type as "senderType", created_at as "createdAt"
    FROM messages WHERE conversation_id = ${conversationId}::uuid
    ORDER BY created_at ASC
  `;

  return Response.json(
    { contact: contact[0], messages },
    { headers: { ...corsHeaders(), 'Content-Disposition': 'attachment; filename="flowchat-export.json"' } }
  );
}

/** GDPR: delete visitor contact and conversation data. */
export async function DELETE(req: Request) {
  const body = (await req.json()) as { conversationId?: string };
  const visitorToken = req.headers.get('X-Visitor-Token');
  if (!body.conversationId || !visitorToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const ctx = await resolveVisitor(body.conversationId, visitorToken);
  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM messages WHERE conversation_id = ${body.conversationId}::uuid`;
  await sql`DELETE FROM conversations WHERE id = ${body.conversationId}::uuid`;
  await sql`DELETE FROM contact_inboxes WHERE contact_id = ${ctx.contactId}::uuid`;
  await sql`DELETE FROM contacts WHERE id = ${ctx.contactId}::uuid`;

  return Response.json({ ok: true }, { headers: corsHeaders() });
}
