import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const url = new URL(req.url);
  const inboxId = url.searchParams.get('inboxId');
  const status = url.searchParams.get('status') ?? 'open';
  const validStatuses = ['open', 'pending', 'resolved', 'snoozed'];
  const statusFilter = validStatuses.includes(status) ? status : 'open';

  const sql = neon(databaseUrl);

  const rows = inboxId
    ? await sql`
        SELECT c.id, c.inbox_id as "inboxId", c.contact_id as "contactId",
               c.status, c.last_message_at as "lastMessageAt",
               c.last_message_preview as "lastMessagePreview",
               c.unread_count as "unreadCount", c.created_at as "createdAt",
               ct.name as "contactName", ct.email as "contactEmail",
               i.name as "inboxName"
        FROM conversations c
        INNER JOIN contacts ct ON ct.id = c.contact_id
        INNER JOIN inboxes i ON i.id = c.inbox_id
        WHERE c.account_id = ${accountId}::uuid
          AND c.status = ${statusFilter}
          AND c.inbox_id = ${inboxId}::uuid
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `
    : await sql`
        SELECT c.id, c.inbox_id as "inboxId", c.contact_id as "contactId",
               c.status, c.last_message_at as "lastMessageAt",
               c.last_message_preview as "lastMessagePreview",
               c.unread_count as "unreadCount", c.created_at as "createdAt",
               ct.name as "contactName", ct.email as "contactEmail",
               i.name as "inboxName"
        FROM conversations c
        INNER JOIN contacts ct ON ct.id = c.contact_id
        INNER JOIN inboxes i ON i.id = c.inbox_id
        WHERE c.account_id = ${accountId}::uuid AND c.status = ${statusFilter}
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `;

  return Response.json({ conversations: rows });
}
