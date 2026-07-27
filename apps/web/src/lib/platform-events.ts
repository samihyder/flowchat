import type { AppSql } from '@/lib/db-sql';
import { runAutomationRules } from '@/lib/automation/rules';
import { recordReportingEvent } from '@/lib/reporting/events';
import { computeConversationSlaDeadlines } from '@/lib/sla/policies';

/**
 * Shared side-effects for conversation/contact lifecycle events:
 * automation rules, reporting events, and SLA deadline setup.
 */
export async function emitPlatformEvent(
  sql: AppSql,
  accountId: string,
  event:
    | 'conversation.created'
    | 'message.created'
    | 'conversation.resolved'
    | 'contact.created'
    | 'first_response'
    | 'resolution_time',
  context: Record<string, unknown>
): Promise<void> {
  const conversationId =
    typeof context.conversationId === 'string' ? context.conversationId : null;
  const inboxId = typeof context.inboxId === 'string' ? context.inboxId : null;
  const agentId =
    typeof context.agentId === 'string'
      ? context.agentId
      : typeof context.assigneeId === 'string'
        ? context.assigneeId
        : null;

  if (
    event === 'conversation.created' ||
    event === 'message.created' ||
    event === 'conversation.resolved' ||
    event === 'contact.created'
  ) {
    void runAutomationRules(sql, accountId, event, context).catch(() => undefined);
  }

  void recordReportingEvent(sql, {
    accountId,
    conversationId,
    inboxId,
    agentId,
    eventType: event,
    valueMs: typeof context.valueMs === 'number' ? context.valueMs : null,
    metadata: context,
  }).catch(() => undefined);

  if (event === 'conversation.created' && conversationId) {
    void computeConversationSlaDeadlines(sql, accountId, conversationId).catch(() => undefined);
  }
}
