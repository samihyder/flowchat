import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { canControlCampaign } from '@/lib/marketing/permissions';
import {
  getMarketingCampaign,
  type MarketingCampaignStatus,
} from '@/lib/marketing/s6m-campaigns';

export type CampaignControlAction = 'pause' | 'resume' | 'cancel';

export type CampaignControlPreview = {
  pendingSends: number;
  queuedRecipients: number;
  nextScheduledAt: string | null;
};

async function logActivity(
  sql: AppSql,
  campaignId: string,
  eventType: string,
  payload: Record<string, unknown> = {}
) {
  await sql`
    INSERT INTO marketing_campaign_activity (campaign_id, event_type, payload)
    VALUES (${campaignId}::uuid, ${eventType}, ${JSON.stringify(payload)}::jsonb)
  `;
}

export async function getCampaignControlPreview(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<CampaignControlPreview> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND);
  }

  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int as "pendingSends",
      COUNT(DISTINCT recipient_id) FILTER (WHERE status = 'pending')::int as "queuedRecipients",
      MIN(scheduled_at) FILTER (WHERE status = 'pending') as "nextScheduledAt"
    FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid
  `;
  const row = rows[0] as {
    pendingSends: number;
    queuedRecipients: number;
    nextScheduledAt: Date | null;
  };

  return {
    pendingSends: row.pendingSends ?? 0,
    queuedRecipients: row.queuedRecipients ?? 0,
    nextScheduledAt: row.nextScheduledAt
      ? new Date(row.nextScheduledAt).toISOString()
      : null,
  };
}

export async function controlMarketingCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  action: CampaignControlAction,
  role: string,
  userId: string
): Promise<{ status: MarketingCampaignStatus }> {
  if (!canControlCampaign(role)) {
    throw new MarketingError(MarketingErrorCode.FORBIDDEN);
  }

  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND);
  }

  if (action === 'pause') {
    if (campaign.status !== 'running' && campaign.status !== 'scheduled') {
      throw new MarketingError(MarketingErrorCode.CONFLICT, {
        message: 'Only running or scheduled campaigns can be paused.',
      });
    }
    await sql`
      UPDATE marketing_campaigns
      SET status = 'paused', paused_at = NOW(), updated_at = NOW()
      WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    `;
    await logActivity(sql, campaignId, 'campaign_paused', { userId });
    return { status: 'paused' };
  }

  if (action === 'resume') {
    if (campaign.status !== 'paused') {
      throw new MarketingError(MarketingErrorCode.CONFLICT, {
        message: 'Only paused campaigns can be resumed.',
      });
    }
    const nextStatus: MarketingCampaignStatus =
      campaign.launchedAt && new Date(campaign.launchedAt).getTime() > Date.now()
        ? 'scheduled'
        : 'running';
    await sql`
      UPDATE marketing_campaigns
      SET status = ${nextStatus}, paused_at = NULL, updated_at = NOW()
      WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    `;
    await logActivity(sql, campaignId, 'campaign_resumed', { userId, status: nextStatus });
    return { status: nextStatus };
  }

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    throw new MarketingError(MarketingErrorCode.CONFLICT, {
      message: 'This campaign cannot be cancelled.',
    });
  }

  const preview = await getCampaignControlPreview(sql, accountId, campaignId);

  await sql`
    UPDATE marketing_campaign_recipient_steps
    SET status = 'skipped', updated_at = NOW()
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending'
  `;

  await sql`
    UPDATE marketing_campaigns
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
  `;

  await logActivity(sql, campaignId, 'campaign_cancelled', { userId, ...preview });

  return { status: 'cancelled' };
}
