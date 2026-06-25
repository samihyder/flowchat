import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';

export type MarketingTimelineEvent = {
  id: string;
  eventType: string;
  campaignId: string;
  campaignName: string;
  stepOrder: number | null;
  subject: string | null;
  status: string | null;
  createdAt: string;
  detail: string | null;
};

export async function getContactMarketingTimeline(
  sql: AppSql,
  accountId: string,
  contactId: string
): Promise<MarketingTimelineEvent[]> {
  const contact = await sql`
    SELECT id FROM contacts WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!contact[0]) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Contact not found' });
  }

  const stepRows = await sql`
    SELECT
      rs.id,
      rs.status,
      rs.sent_at as "sentAt",
      rs.updated_at as "updatedAt",
      s.step_order as "stepOrder",
      s.subject,
      c.id as "campaignId",
      c.name as "campaignName"
    FROM marketing_campaign_recipient_steps rs
    INNER JOIN marketing_campaign_recipients r ON r.id = rs.recipient_id
    INNER JOIN marketing_campaign_steps s ON s.id = rs.campaign_step_id
    INNER JOIN marketing_campaigns c ON c.id = rs.campaign_id
    WHERE r.contact_id = ${contactId}::uuid AND c.account_id = ${accountId}::uuid
      AND rs.status NOT IN ('pending', 'skipped')
    ORDER BY COALESCE(rs.sent_at, rs.updated_at) DESC
    LIMIT 100
  `;

  const activityRows = await sql`
    SELECT
      a.id,
      a.event_type as "eventType",
      a.created_at as "createdAt",
      a.payload,
      c.id as "campaignId",
      c.name as "campaignName"
    FROM marketing_campaign_activity a
    INNER JOIN marketing_campaign_recipients r ON r.id = a.recipient_id
    INNER JOIN marketing_campaigns c ON c.id = a.campaign_id
    WHERE r.contact_id = ${contactId}::uuid AND c.account_id = ${accountId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 50
  `;

  const events: MarketingTimelineEvent[] = [];

  for (const row of stepRows as Record<string, unknown>[]) {
    const status = row.status as string;
    const eventType =
      status === 'clicked'
        ? 'clicked'
        : status === 'opened'
          ? 'opened'
          : status.startsWith('stopped_')
            ? 'stopped'
            : 'sent';
    events.push({
      id: `step-${row.id}`,
      eventType,
      campaignId: row.campaignId as string,
      campaignName: row.campaignName as string,
      stepOrder: Number(row.stepOrder),
      subject: row.subject as string,
      status,
      createdAt: new Date((row.sentAt ?? row.updatedAt) as Date).toISOString(),
      detail: null,
    });
  }

  for (const row of activityRows as Record<string, unknown>[]) {
    const payload = (row.payload as Record<string, unknown>) ?? {};
    events.push({
      id: row.id as string,
      eventType: row.eventType as string,
      campaignId: row.campaignId as string,
      campaignName: row.campaignName as string,
      stepOrder: payload.stepOrder != null ? Number(payload.stepOrder) : null,
      subject: null,
      status: null,
      createdAt: new Date(row.createdAt as Date).toISOString(),
      detail: payload.reason ? String(payload.reason) : null,
    });
  }

  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return events.slice(0, 100);
}
