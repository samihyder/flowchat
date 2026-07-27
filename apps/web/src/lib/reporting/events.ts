import type { AppSql } from '@/lib/db-sql';

export async function recordReportingEvent(
  sql: AppSql,
  input: {
    accountId: string;
    conversationId?: string | null;
    inboxId?: string | null;
    agentId?: string | null;
    eventType: string;
    valueMs?: number | null;
    metadata?: Record<string, unknown>;
    occurredAt?: string | null;
  }
): Promise<string> {
  const rows = await sql`
    INSERT INTO reporting_events (
      account_id, conversation_id, inbox_id, agent_id,
      event_type, value_ms, metadata, occurred_at
    )
    VALUES (
      ${input.accountId}::uuid,
      ${input.conversationId ?? null}::uuid,
      ${input.inboxId ?? null}::uuid,
      ${input.agentId ?? null}::uuid,
      ${input.eventType},
      ${input.valueMs ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb,
      COALESCE(${input.occurredAt ?? null}::timestamptz, NOW())
    )
    RETURNING id
  `;
  return (rows[0] as { id: string }).id;
}

export async function getOverviewMetrics(
  sql: AppSql,
  accountId: string,
  from: string,
  to: string
) {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'conversation.created')::int as "conversationsCreated",
      COUNT(*) FILTER (WHERE event_type = 'conversation.resolved')::int as "conversationsResolved",
      COUNT(*) FILTER (WHERE event_type = 'message.created')::int as "messagesCreated",
      COUNT(*) FILTER (WHERE event_type = 'first_response')::int as "firstResponses",
      COALESCE(AVG(value_ms) FILTER (WHERE event_type = 'first_response'), 0)::int as "avgFirstResponseMs",
      COALESCE(AVG(value_ms) FILTER (WHERE event_type = 'resolution_time'), 0)::int as "avgResolutionMs"
    FROM reporting_events
    WHERE account_id = ${accountId}::uuid
      AND occurred_at >= ${from}::timestamptz
      AND occurred_at <= ${to}::timestamptz
  `;

  // Fallback from live tables when reporting_events is sparse
  const live = await sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${from}::timestamptz AND created_at <= ${to}::timestamptz)::int as "conversationsCreated",
      COUNT(*) FILTER (
        WHERE status = 'resolved'
          AND updated_at >= ${from}::timestamptz AND updated_at <= ${to}::timestamptz
      )::int as "conversationsResolved",
      COUNT(*) FILTER (WHERE status = 'open')::int as "openConversations"
    FROM conversations
    WHERE account_id = ${accountId}::uuid
  `;

  const msgLive = await sql`
    SELECT COUNT(*)::int as "messagesCreated"
    FROM messages
    WHERE account_id = ${accountId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
  `;

  const events = rows[0] as Record<string, number>;
  const conv = live[0] as Record<string, number>;
  const msgs = msgLive[0] as { messagesCreated: number };

  return {
    from,
    to,
    conversationsCreated: events.conversationsCreated || conv.conversationsCreated || 0,
    conversationsResolved: events.conversationsResolved || conv.conversationsResolved || 0,
    openConversations: conv.openConversations || 0,
    messagesCreated: events.messagesCreated || msgs.messagesCreated || 0,
    firstResponses: events.firstResponses || 0,
    avgFirstResponseMs: events.avgFirstResponseMs || 0,
    avgResolutionMs: events.avgResolutionMs || 0,
  };
}

export async function getAgentPerformance(
  sql: AppSql,
  accountId: string,
  from: string,
  to: string
) {
  const fromEvents = await sql`
    SELECT
      e.agent_id as "agentId",
      u.name as "agentName",
      COUNT(*) FILTER (WHERE e.event_type = 'conversation.resolved')::int as "resolvedCount",
      COUNT(*) FILTER (WHERE e.event_type = 'first_response')::int as "firstResponses",
      COALESCE(AVG(e.value_ms) FILTER (WHERE e.event_type = 'first_response'), 0)::int as "avgFrtMs",
      COUNT(*) FILTER (WHERE e.event_type = 'message.created')::int as "messagesSent",
      COALESCE(AVG(e.value_ms) FILTER (WHERE e.event_type = 'csat'), NULL)::float as "csatAvg"
    FROM reporting_events e
    LEFT JOIN users u ON u.id = e.agent_id
    WHERE e.account_id = ${accountId}::uuid
      AND e.agent_id IS NOT NULL
      AND e.occurred_at >= ${from}::timestamptz
      AND e.occurred_at <= ${to}::timestamptz
    GROUP BY e.agent_id, u.name
    ORDER BY "resolvedCount" DESC
  `;

  if (fromEvents.length > 0) {
    return fromEvents;
  }

  // Fallback: assign/resolve activity from conversations
  return sql`
    SELECT
      c.assignee_id as "agentId",
      u.name as "agentName",
      COUNT(*) FILTER (WHERE c.status = 'resolved')::int as "resolvedCount",
      COUNT(*) FILTER (WHERE c.first_response_at IS NOT NULL)::int as "firstResponses",
      0 as "avgFrtMs",
      NULL::float as "csatAvg",
      (
        SELECT COUNT(*)::int FROM messages m
        WHERE m.account_id = ${accountId}::uuid
          AND m.sender_id = c.assignee_id
          AND m.sender_type = 'agent'
          AND m.created_at >= ${from}::timestamptz
          AND m.created_at <= ${to}::timestamptz
      ) as "messagesSent"
    FROM conversations c
    LEFT JOIN users u ON u.id = c.assignee_id
    WHERE c.account_id = ${accountId}::uuid
      AND c.assignee_id IS NOT NULL
      AND c.updated_at >= ${from}::timestamptz
      AND c.updated_at <= ${to}::timestamptz
    GROUP BY c.assignee_id, u.name
    ORDER BY "resolvedCount" DESC
  `;
}
