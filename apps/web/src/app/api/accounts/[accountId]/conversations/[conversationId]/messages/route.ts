import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { insertMessage } from '@/lib/conversations';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const conv = await sql`
    SELECT id FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!conv[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  const rows = await sql`
    SELECT id, conversation_id as "conversationId", content,
           sender_type as "senderType", sender_id as "senderId",
           created_at as "createdAt"
    FROM messages
    WHERE conversation_id = ${conversationId}::uuid
    ORDER BY created_at ASC
  `;

  const messages = rows.map((m) => ({
    ...m,
    createdAt: new Date((m as { createdAt: Date | string }).createdAt).toISOString(),
  }));

  return Response.json({ messages });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { content?: string };
  if (!body.content?.trim()) return Response.json({ error: 'Content is required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
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
  });

  return Response.json({ message }, { status: 201 });
}
