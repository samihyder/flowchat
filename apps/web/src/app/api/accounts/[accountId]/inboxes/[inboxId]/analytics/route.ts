import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; inboxId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const sql = neon(databaseUrl);

  const inboxRows = await sql`
    SELECT id, name, website_url as "websiteUrl", default_assignee_id as "defaultAssigneeId"
    FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!inboxRows[0]) return Response.json({ error: 'Inbox not found' }, { status: 404 });

  const [visits, uniqueVisitors, conversations, openConvs, resolvedConvs, messages, chatsStarted] =
    await Promise.all([
      sql`
        SELECT COUNT(*)::int as count FROM inbox_visits
        WHERE inbox_id = ${inboxId}::uuid
          AND created_at >= ${fromDate.toISOString()}::timestamptz
          AND created_at <= ${toDate.toISOString()}::timestamptz
      `,
      sql`
        SELECT COUNT(DISTINCT COALESCE(source_id, ip_address))::int as count FROM inbox_visits
        WHERE inbox_id = ${inboxId}::uuid
          AND created_at >= ${fromDate.toISOString()}::timestamptz
          AND created_at <= ${toDate.toISOString()}::timestamptz
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations
        WHERE inbox_id = ${inboxId}::uuid
          AND created_at >= ${fromDate.toISOString()}::timestamptz
          AND created_at <= ${toDate.toISOString()}::timestamptz
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations
        WHERE inbox_id = ${inboxId}::uuid AND status = 'open'
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations
        WHERE inbox_id = ${inboxId}::uuid AND status = 'resolved'
          AND updated_at >= ${fromDate.toISOString()}::timestamptz
          AND updated_at <= ${toDate.toISOString()}::timestamptz
      `,
      sql`
        SELECT COUNT(*)::int as count FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE c.inbox_id = ${inboxId}::uuid
          AND m.created_at >= ${fromDate.toISOString()}::timestamptz
          AND m.created_at <= ${toDate.toISOString()}::timestamptz
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations
        WHERE inbox_id = ${inboxId}::uuid
          AND created_at >= ${fromDate.toISOString()}::timestamptz
          AND created_at <= ${toDate.toISOString()}::timestamptz
      `,
    ]);

  const daily = await sql`
    SELECT d.day::text as date,
           COALESCE(v.visits, 0)::int as visits,
           COALESCE(c.conversations, 0)::int as conversations,
           COALESCE(m.messages, 0)::int as messages
    FROM generate_series(
      ${fromDate.toISOString().slice(0, 10)}::date,
      ${toDate.toISOString().slice(0, 10)}::date,
      '1 day'::interval
    ) AS d(day)
    LEFT JOIN (
      SELECT DATE(created_at) as day, COUNT(*) as visits
      FROM inbox_visits WHERE inbox_id = ${inboxId}::uuid
        AND created_at >= ${fromDate.toISOString()}::timestamptz
        AND created_at <= ${toDate.toISOString()}::timestamptz
      GROUP BY DATE(created_at)
    ) v ON v.day = d.day
    LEFT JOIN (
      SELECT DATE(created_at) as day, COUNT(*) as conversations
      FROM conversations WHERE inbox_id = ${inboxId}::uuid
        AND created_at >= ${fromDate.toISOString()}::timestamptz
        AND created_at <= ${toDate.toISOString()}::timestamptz
      GROUP BY DATE(created_at)
    ) c ON c.day = d.day
    LEFT JOIN (
      SELECT DATE(m.created_at) as day, COUNT(*) as messages
      FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id
      WHERE cv.inbox_id = ${inboxId}::uuid
        AND m.created_at >= ${fromDate.toISOString()}::timestamptz
        AND m.created_at <= ${toDate.toISOString()}::timestamptz
      GROUP BY DATE(m.created_at)
    ) m ON m.day = d.day
    ORDER BY d.day ASC
  `;

  const activeChats = await sql`
    SELECT c.id as "conversationId", ct.name as "contactName", ct.email as "contactEmail",
           ci.last_ip_address as "ipAddress", c.created_at as "startedAt",
           c.last_message_at as "lastMessageAt", c.unread_count as "unreadCount",
           u.name as "assigneeName", c.assignee_id as "assigneeId"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    LEFT JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
    LEFT JOIN users u ON u.id = c.assignee_id
    WHERE c.inbox_id = ${inboxId}::uuid AND c.status = 'open'
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    LIMIT 50
  `;

  const recentVisits = await sql`
    SELECT ip_address as "ipAddress", user_agent as "userAgent",
           source_id as "sourceId", page_url as "pageUrl", created_at as "visitedAt"
    FROM inbox_visits
    WHERE inbox_id = ${inboxId}::uuid
      AND created_at >= ${fromDate.toISOString()}::timestamptz
      AND created_at <= ${toDate.toISOString()}::timestamptz
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const assignee = inboxRows[0].defaultAssigneeId
    ? await sql`SELECT name FROM users WHERE id = ${inboxRows[0].defaultAssigneeId}::uuid LIMIT 1`
    : [];

  return Response.json({
    inbox: {
      ...inboxRows[0],
      defaultAssigneeName: (assignee[0] as { name: string } | undefined)?.name ?? null,
    },
    range: { from: fromDate.toISOString(), to: toDate.toISOString() },
    summary: {
      totalVisits: (visits[0] as { count: number }).count,
      uniqueVisitors: (uniqueVisitors[0] as { count: number }).count,
      totalConversations: (conversations[0] as { count: number }).count,
      openConversations: (openConvs[0] as { count: number }).count,
      resolvedConversations: (resolvedConvs[0] as { count: number }).count,
      totalMessages: (messages[0] as { count: number }).count,
      chatsStarted: (chatsStarted[0] as { count: number }).count,
    },
    daily,
    activeChats,
    recentVisits,
  });
}
