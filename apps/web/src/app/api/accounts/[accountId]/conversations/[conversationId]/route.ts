import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { publishEvent } from '@/lib/redis';

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
           c.status, c.priority, c.assignee_id as "assigneeId",
           c.snoozed_until as "snoozedUntil", c.unread_count as "unreadCount",
           c.last_message_at as "lastMessageAt", c.last_message_preview as "lastMessagePreview",
           c.created_at as "createdAt",
           ct.name as "contactName", ct.email as "contactEmail",
           i.name as "inboxName", u.name as "assigneeName"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    LEFT JOIN users u ON u.id = c.assignee_id
    WHERE c.id = ${conversationId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  await sql`UPDATE conversations SET unread_count = 0 WHERE id = ${conversationId}::uuid`;

  const labels = await sql`
    SELECT l.id, l.name, l.color
    FROM conversation_labels cl
    INNER JOIN labels l ON l.id = cl.label_id
    WHERE cl.conversation_id = ${conversationId}::uuid
  `;

  return Response.json({ conversation: { ...rows[0], labels } });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    status?: 'open' | 'pending' | 'resolved' | 'snoozed';
    assigneeId?: string | null;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    snoozedUntil?: string | null;
    labelIds?: string[];
    blockContact?: boolean;
    blockIp?: boolean;
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const existing = await sql`
    SELECT id, contact_id as "contactId", inbox_id as "inboxId", status FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  let status = body.status;
  let snoozedUntil = body.snoozedUntil;

  if (body.snoozedUntil) {
    status = 'snoozed';
    snoozedUntil = body.snoozedUntil;
  } else if (body.status === 'snoozed' && !body.snoozedUntil) {
    return Response.json({ error: 'snoozedUntil is required when snoozing' }, { status: 400 });
  } else if (body.status && body.status !== 'snoozed') {
    snoozedUntil = null;
  }

  if (body.assigneeId) {
    const member = await sql`
      SELECT 1 FROM account_users WHERE account_id = ${accountId}::uuid AND user_id = ${body.assigneeId}::uuid LIMIT 1
    `;
    if (!member[0]) return Response.json({ error: 'Invalid assignee' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE conversations SET
      status = COALESCE(${status ?? null}, status),
      assignee_id = CASE WHEN ${body.assigneeId !== undefined} THEN ${body.assigneeId}::uuid ELSE assignee_id END,
      priority = COALESCE(${body.priority ?? null}, priority),
      snoozed_until = CASE
        WHEN ${snoozedUntil !== undefined} THEN ${snoozedUntil}::timestamptz
        ELSE snoozed_until
      END,
      updated_at = NOW()
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, inbox_id as "inboxId", contact_id as "contactId", status, priority,
              assignee_id as "assigneeId", snoozed_until as "snoozedUntil",
              unread_count as "unreadCount", last_message_at as "lastMessageAt",
              last_message_preview as "lastMessagePreview", created_at as "createdAt"
  `;

  if (body.labelIds) {
    await sql`DELETE FROM conversation_labels WHERE conversation_id = ${conversationId}::uuid`;
    for (const labelId of body.labelIds) {
      await sql`
        INSERT INTO conversation_labels (conversation_id, label_id)
        SELECT ${conversationId}::uuid, ${labelId}::uuid
        WHERE EXISTS (SELECT 1 FROM labels WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid)
        ON CONFLICT DO NOTHING
      `;
    }
  }

  const existingRow = existing[0] as { contactId: string; inboxId: string };

  if (body.blockContact) {
    await sql`
      UPDATE contacts SET is_blocked = true, blocked_at = NOW()
      WHERE id = ${existingRow.contactId}::uuid
    `;
  }

  if (body.blockIp) {
    const ips = await sql`
      SELECT last_ip_address as ip FROM contact_inboxes
      WHERE contact_id = ${existingRow.contactId}::uuid
        AND inbox_id = ${existingRow.inboxId}::uuid
        AND last_ip_address IS NOT NULL
      LIMIT 1
    `;
    const ip = (ips[0] as { ip: string } | undefined)?.ip;
    if (ip) {
      const dup = await sql`
        SELECT 1 FROM blocked_ips
        WHERE account_id = ${accountId}::uuid AND ip_address = ${ip}
          AND (inbox_id = ${existingRow.inboxId}::uuid OR inbox_id IS NULL)
        LIMIT 1
      `;
      if (!dup[0]) {
        await sql`
          INSERT INTO blocked_ips (account_id, inbox_id, ip_address, reason)
          VALUES (${accountId}::uuid, ${existingRow.inboxId}::uuid, ${ip}, 'Blocked from conversation')
        `;
      }
    }
  }

  void publishEvent(`account:${accountId}`, {
    type: 'conversation_updated',
    conversationId,
    accountId,
  });

  return Response.json({ conversation: rows[0] });
}
