import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

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
  const rows = await sql`
    SELECT c.id, c.inbox_id as "inboxId", c.contact_id as "contactId",
           c.status, c.unread_count as "unreadCount",
           ct.name as "contactName", ct.email as "contactEmail",
           i.name as "inboxName"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    WHERE c.id = ${conversationId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  await sql`UPDATE conversations SET unread_count = 0 WHERE id = ${conversationId}::uuid`;

  return Response.json({ conversation: rows[0] });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { status?: 'open' | 'pending' | 'resolved' | 'snoozed' };
  if (!body.status) return Response.json({ error: 'Status is required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    UPDATE conversations SET status = ${body.status}, updated_at = NOW()
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, inbox_id as "inboxId", contact_id as "contactId", status,
              unread_count as "unreadCount", last_message_at as "lastMessageAt",
              last_message_preview as "lastMessagePreview", created_at as "createdAt"
  `;

  if (!rows[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });
  return Response.json({ conversation: rows[0] });
}
