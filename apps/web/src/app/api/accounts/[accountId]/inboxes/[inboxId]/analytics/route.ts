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
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ip_address IS NOT NULL AND e.value = ip_address)
                OR (e.exception_type = 'machine' AND source_id IS NOT NULL AND e.value = source_id)
              )
          )
      `,
      sql`
        SELECT COUNT(DISTINCT COALESCE(source_id, ip_address))::int as count FROM inbox_visits
        WHERE inbox_id = ${inboxId}::uuid
          AND created_at >= ${fromDate.toISOString()}::timestamptz
          AND created_at <= ${toDate.toISOString()}::timestamptz
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ip_address IS NOT NULL AND e.value = ip_address)
                OR (e.exception_type = 'machine' AND source_id IS NOT NULL AND e.value = source_id)
              )
          )
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations c
        WHERE c.inbox_id = ${inboxId}::uuid
          AND c.created_at >= ${fromDate.toISOString()}::timestamptz
          AND c.created_at <= ${toDate.toISOString()}::timestamptz
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
                OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
              )
          )
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations c
        WHERE c.inbox_id = ${inboxId}::uuid AND c.status = 'open'
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
                OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
              )
          )
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations c
        WHERE c.inbox_id = ${inboxId}::uuid AND c.status = 'resolved'
          AND c.updated_at >= ${fromDate.toISOString()}::timestamptz
          AND c.updated_at <= ${toDate.toISOString()}::timestamptz
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
                OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
              )
          )
      `,
      sql`
        SELECT COUNT(*)::int as count FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE c.inbox_id = ${inboxId}::uuid
          AND m.created_at >= ${fromDate.toISOString()}::timestamptz
          AND m.created_at <= ${toDate.toISOString()}::timestamptz
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
                OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
              )
          )
      `,
      sql`
        SELECT COUNT(*)::int as count FROM conversations c
        WHERE c.inbox_id = ${inboxId}::uuid
          AND c.created_at >= ${fromDate.toISOString()}::timestamptz
          AND c.created_at <= ${toDate.toISOString()}::timestamptz
          AND NOT EXISTS (
            SELECT 1 FROM inbox_analytics_exceptions e
            INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
            WHERE e.inbox_id = ${inboxId}::uuid
              AND (
                (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
                OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
              )
          )
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
      FROM inbox_visits
      WHERE inbox_id = ${inboxId}::uuid
        AND created_at >= ${fromDate.toISOString()}::timestamptz
        AND created_at <= ${toDate.toISOString()}::timestamptz
        AND NOT EXISTS (
          SELECT 1 FROM inbox_analytics_exceptions e
          WHERE e.inbox_id = ${inboxId}::uuid
            AND (
              (e.exception_type = 'ip' AND ip_address IS NOT NULL AND e.value = ip_address)
              OR (e.exception_type = 'machine' AND source_id IS NOT NULL AND e.value = source_id)
            )
        )
      GROUP BY DATE(created_at)
    ) v ON v.day = d.day
    LEFT JOIN (
      SELECT DATE(c.created_at) as day, COUNT(*) as conversations
      FROM conversations c
      WHERE c.inbox_id = ${inboxId}::uuid
        AND c.created_at >= ${fromDate.toISOString()}::timestamptz
        AND c.created_at <= ${toDate.toISOString()}::timestamptz
        AND NOT EXISTS (
          SELECT 1 FROM inbox_analytics_exceptions e
          INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
          WHERE e.inbox_id = ${inboxId}::uuid
            AND (
              (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
              OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
            )
        )
      GROUP BY DATE(c.created_at)
    ) c ON c.day = d.day
    LEFT JOIN (
      SELECT DATE(m.created_at) as day, COUNT(*) as messages
      FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id
      WHERE cv.inbox_id = ${inboxId}::uuid
        AND m.created_at >= ${fromDate.toISOString()}::timestamptz
        AND m.created_at <= ${toDate.toISOString()}::timestamptz
        AND NOT EXISTS (
          SELECT 1 FROM inbox_analytics_exceptions e
          INNER JOIN contact_inboxes ci ON ci.contact_id = cv.contact_id AND ci.inbox_id = cv.inbox_id
          WHERE e.inbox_id = ${inboxId}::uuid
            AND (
              (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
              OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
            )
        )
      GROUP BY DATE(m.created_at)
    ) m ON m.day = d.day
    ORDER BY d.day ASC
  `;

  const activeChats = await sql`
    SELECT c.id as "conversationId", ct.name as "contactName", ct.email as "contactEmail",
           ci.last_ip_address as "ipAddress", ci.source_id as "sourceId",
           c.created_at as "startedAt",
           c.last_message_at as "lastMessageAt", c.unread_count as "unreadCount",
           u.name as "assigneeName", c.assignee_id as "assigneeId"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    LEFT JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
    LEFT JOIN users u ON u.id = c.assignee_id
    WHERE c.inbox_id = ${inboxId}::uuid AND c.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM inbox_analytics_exceptions e
        WHERE e.inbox_id = ${inboxId}::uuid
          AND (
            (e.exception_type = 'ip' AND ci.last_ip_address IS NOT NULL AND e.value = ci.last_ip_address)
            OR (e.exception_type = 'machine' AND ci.source_id IS NOT NULL AND e.value = ci.source_id)
          )
      )
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
      AND NOT EXISTS (
        SELECT 1 FROM inbox_analytics_exceptions e
        WHERE e.inbox_id = ${inboxId}::uuid
          AND (
            (e.exception_type = 'ip' AND ip_address IS NOT NULL AND e.value = ip_address)
            OR (e.exception_type = 'machine' AND source_id IS NOT NULL AND e.value = source_id)
          )
      )
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const exceptionRows = await sql`
    SELECT id, exception_type as "type", value, label, created_at as "createdAt"
    FROM inbox_analytics_exceptions
    WHERE inbox_id = ${inboxId}::uuid
    ORDER BY created_at DESC
  `;

  const assignee = inboxRows[0].defaultAssigneeId
    ? await sql`SELECT name FROM users WHERE id = ${inboxRows[0].defaultAssigneeId}::uuid LIMIT 1`
    : [];

  const [kpiRow, csatRow, missedRow] = await Promise.all([
    sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)
          FILTER (WHERE first_response_at IS NOT NULL
            AND created_at >= ${fromDate.toISOString()}::timestamptz
            AND created_at <= ${toDate.toISOString()}::timestamptz) as "avgFrt",
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
          FILTER (WHERE resolved_at IS NOT NULL
            AND resolved_at >= ${fromDate.toISOString()}::timestamptz
            AND resolved_at <= ${toDate.toISOString()}::timestamptz) as "avgResolution"
      FROM conversations
      WHERE inbox_id = ${inboxId}::uuid
    `,
    sql`
      SELECT AVG(score)::float as avg FROM csat_responses
      WHERE inbox_id = ${inboxId}::uuid
        AND submitted_at >= ${fromDate.toISOString()}::timestamptz
        AND submitted_at <= ${toDate.toISOString()}::timestamptz
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE missed_alert_sent_at IS NOT NULL)::int as missed,
        COUNT(*)::int as total
      FROM conversations
      WHERE inbox_id = ${inboxId}::uuid
        AND created_at >= ${fromDate.toISOString()}::timestamptz
        AND created_at <= ${toDate.toISOString()}::timestamptz
    `,
  ]);

  const avgFrt = (kpiRow[0] as { avgFrt: number | null } | undefined)?.avgFrt;
  const avgResolution = (kpiRow[0] as { avgResolution: number | null } | undefined)?.avgResolution;
  const csatAverage = (csatRow[0] as { avg: number | null } | undefined)?.avg;
  const missed = (missedRow[0] as { missed: number; total: number } | undefined)?.missed ?? 0;
  const totalConv = (missedRow[0] as { missed: number; total: number } | undefined)?.total ?? 0;

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
      avgFirstResponseMinutes: avgFrt != null ? Math.round(avgFrt) : null,
      avgResolutionMinutes: avgResolution != null ? Math.round(avgResolution) : null,
      missedChatRate: totalConv > 0 ? Math.round((missed / totalConv) * 100) : null,
      csatAverage: csatAverage != null ? Math.round(csatAverage * 10) / 10 : null,
    },
    daily,
    activeChats,
    recentVisits,
    exceptions: exceptionRows,
  });
}
