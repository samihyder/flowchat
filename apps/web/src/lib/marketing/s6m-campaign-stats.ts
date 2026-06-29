import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { getMarketingCampaign } from '@/lib/marketing/s6m-campaigns';

export type CampaignStatsOverview = {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  pending: number;
  stoppedBounce: number;
  stoppedUnsubscribe: number;
  stoppedReply: number;
  stoppedComplaint: number;
  progressPercent: number;
};

export type CampaignStepStats = {
  stepOrder: number;
  subject: string;
  sendAt: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  stopped: number;
  pending: number;
};

export type CampaignRecipientStats = {
  recipientId: string;
  contactId: string;
  name: string;
  email: string;
  stoppedReason: string | null;
  steps: {
    stepOrder: number;
    status: string;
    sentAt: string | null;
  }[];
};

export type CampaignActivityEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type CampaignStatsResult = {
  overview: CampaignStatsOverview;
  steps: CampaignStepStats[];
  recipients: CampaignRecipientStats[];
  activity: CampaignActivityEvent[];
  scheduleTimezone: string;
  scheduleMode: 'campaign' | 'recipient_local';
};

function assertLaunched(status: string) {
  if (status === 'draft') {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Stats are available after a campaign is launched.',
    });
  }
}

export async function getMarketingCampaignStats(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<CampaignStatsResult> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND);
  }
  assertLaunched(campaign.status);

  const overviewRows = await sql`
    SELECT
      COUNT(DISTINCT r.id)::int as "totalRecipients",
      COUNT(*) FILTER (WHERE rs.status IN ('sent','delivered','opened','clicked'))::int as sent,
      COUNT(*) FILTER (WHERE rs.status IN ('delivered','opened','clicked'))::int as delivered,
      COUNT(*) FILTER (WHERE rs.status IN ('opened','clicked'))::int as opened,
      COUNT(*) FILTER (WHERE rs.status = 'clicked')::int as clicked,
      COUNT(*) FILTER (WHERE rs.status = 'failed')::int as failed,
      COUNT(*) FILTER (WHERE rs.status = 'pending')::int as pending,
      COUNT(*) FILTER (WHERE rs.status = 'stopped_bounce')::int as "stoppedBounce",
      COUNT(*) FILTER (WHERE rs.status = 'stopped_unsubscribe')::int as "stoppedUnsubscribe",
      COUNT(*) FILTER (WHERE rs.status = 'stopped_reply')::int as "stoppedReply",
      COUNT(*) FILTER (WHERE rs.status = 'stopped_complaint')::int as "stoppedComplaint"
    FROM marketing_campaign_recipients r
    LEFT JOIN marketing_campaign_recipient_steps rs ON rs.recipient_id = r.id
    WHERE r.campaign_id = ${campaignId}::uuid
  `;
  const o = overviewRows[0] as Record<string, number>;
  const totalSteps = (o.sent ?? 0) + (o.pending ?? 0) + (o.failed ?? 0);
  const progressPercent =
    totalSteps > 0 ? Math.round(((o.sent ?? 0) / totalSteps) * 100) : 0;

  const stepRows = await sql`
    SELECT
      s.step_order as "stepOrder",
      s.subject,
      s.send_at as "sendAt",
      COUNT(*) FILTER (WHERE rs.status IN ('sent','delivered','opened','clicked'))::int as sent,
      COUNT(*) FILTER (WHERE rs.status IN ('delivered','opened','clicked'))::int as delivered,
      COUNT(*) FILTER (WHERE rs.status IN ('opened','clicked'))::int as opened,
      COUNT(*) FILTER (WHERE rs.status = 'clicked')::int as clicked,
      COUNT(*) FILTER (WHERE rs.status = 'failed')::int as failed,
      COUNT(*) FILTER (WHERE rs.status LIKE 'stopped_%')::int as stopped,
      COUNT(*) FILTER (WHERE rs.status = 'pending')::int as pending
    FROM marketing_campaign_steps s
    LEFT JOIN marketing_campaign_recipient_steps rs
      ON rs.campaign_step_id = s.id
    WHERE s.campaign_id = ${campaignId}::uuid
    GROUP BY s.step_order, s.subject, s.send_at
    ORDER BY s.step_order
  `;

  const recipientRows = await sql`
    SELECT
      r.id as "recipientId",
      r.contact_id as "contactId",
      c.name,
      r.email,
      r.stopped_reason as "stoppedReason",
      s.step_order as "stepOrder",
      rs.status,
      rs.sent_at as "sentAt"
    FROM marketing_campaign_recipients r
    JOIN contacts c ON c.id = r.contact_id
    LEFT JOIN marketing_campaign_recipient_steps rs ON rs.recipient_id = r.id
    LEFT JOIN marketing_campaign_steps s ON s.id = rs.campaign_step_id
    WHERE r.campaign_id = ${campaignId}::uuid
    ORDER BY c.name, s.step_order
  `;

  const recipientMap = new Map<string, CampaignRecipientStats>();
  for (const row of recipientRows as {
    recipientId: string;
    contactId: string;
    name: string;
    email: string;
    stoppedReason: string | null;
    stepOrder: number | null;
    status: string | null;
    sentAt: Date | null;
  }[]) {
    let entry = recipientMap.get(row.recipientId);
    if (!entry) {
      entry = {
        recipientId: row.recipientId,
        contactId: row.contactId,
        name: row.name,
        email: row.email,
        stoppedReason: row.stoppedReason,
        steps: [],
      };
      recipientMap.set(row.recipientId, entry);
    }
    if (row.stepOrder != null && row.status) {
      entry.steps.push({
        stepOrder: row.stepOrder,
        status: row.status,
        sentAt: row.sentAt ? new Date(row.sentAt).toISOString() : null,
      });
    }
  }

  const activityRows = await sql`
    SELECT id, event_type as "eventType", payload, created_at as "createdAt"
    FROM marketing_campaign_activity
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return {
    overview: {
      totalRecipients: o.totalRecipients ?? 0,
      sent: o.sent ?? 0,
      delivered: o.delivered ?? 0,
      opened: o.opened ?? 0,
      clicked: o.clicked ?? 0,
      failed: o.failed ?? 0,
      pending: o.pending ?? 0,
      stoppedBounce: o.stoppedBounce ?? 0,
      stoppedUnsubscribe: o.stoppedUnsubscribe ?? 0,
      stoppedReply: o.stoppedReply ?? 0,
      stoppedComplaint: o.stoppedComplaint ?? 0,
      progressPercent,
    },
    steps: (stepRows as Record<string, unknown>[]).map((row) => ({
      stepOrder: Number(row.stepOrder),
      subject: row.subject as string,
      sendAt: row.sendAt ? new Date(row.sendAt as Date).toISOString() : null,
      sent: Number(row.sent ?? 0),
      delivered: Number(row.delivered ?? 0),
      opened: Number(row.opened ?? 0),
      clicked: Number(row.clicked ?? 0),
      failed: Number(row.failed ?? 0),
      stopped: Number(row.stopped ?? 0),
      pending: Number(row.pending ?? 0),
    })),
    recipients: [...recipientMap.values()],
    activity: (activityRows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      eventType: row.eventType as string,
      createdAt: new Date(row.createdAt as Date).toISOString(),
      payload: (row.payload as Record<string, unknown>) ?? {},
    })),
    scheduleTimezone: campaign.scheduleTimezone,
    scheduleMode: campaign.scheduleMode,
  };
}

export async function exportMarketingCampaignCsv(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<string> {
  const stats = await getMarketingCampaignStats(sql, accountId, campaignId);
  const headers = ['name', 'email', 'stopped_reason', 'step_statuses'];
  const lines = [headers.join(',')];

  for (const r of stats.recipients) {
    const stepStatuses = r.steps
      .map((s) => `step${s.stepOrder}:${s.status}`)
      .join(';');
    const cols = [
      JSON.stringify(r.name),
      JSON.stringify(r.email),
      JSON.stringify(r.stoppedReason ?? ''),
      JSON.stringify(stepStatuses),
    ];
    lines.push(cols.join(','));
  }

  return lines.join('\n');
}
