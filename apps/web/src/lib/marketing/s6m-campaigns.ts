import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';

export type MarketingCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type MarketingCampaignRow = {
  id: string;
  name: string;
  status: MarketingCampaignStatus;
  currentStep: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  launchedBy: string | null;
  launchedAt: string | null;
  recipientCount: number;
};

function serializeCampaign(
  row: Record<string, unknown>,
  recipientCount = 0
): MarketingCampaignRow {
  return {
    id: row.id as string,
    name: row.name as string,
    status: row.status as MarketingCampaignStatus,
    currentStep: Number(row.currentStep ?? 1),
    createdBy: (row.createdBy as string | null) ?? null,
    createdAt: new Date(row.createdAt as Date).toISOString(),
    updatedAt: new Date(row.updatedAt as Date).toISOString(),
    launchedBy: (row.launchedBy as string | null) ?? null,
    launchedAt: row.launchedAt ? new Date(row.launchedAt as Date).toISOString() : null,
    recipientCount,
  };
}

export async function listMarketingCampaigns(
  sql: AppSql,
  accountId: string
): Promise<MarketingCampaignRow[]> {
  const rows = await sql`
    SELECT c.id, c.name, c.status, c.current_step as "currentStep",
           c.created_by as "createdBy", c.created_at as "createdAt", c.updated_at as "updatedAt",
           c.launched_by as "launchedBy", c.launched_at as "launchedAt",
           COALESCE(r.cnt, 0)::int as "recipientCount"
    FROM marketing_campaigns c
    LEFT JOIN (
      SELECT campaign_id, COUNT(*)::int as cnt
      FROM marketing_campaign_recipients
      GROUP BY campaign_id
    ) r ON r.campaign_id = c.id
    WHERE c.account_id = ${accountId}::uuid
    ORDER BY c.updated_at DESC
    LIMIT 100
  `;
  return (rows as Record<string, unknown>[]).map((row) =>
    serializeCampaign(row, Number(row.recipientCount ?? 0))
  );
}

export async function createMarketingCampaignDraft(
  sql: AppSql,
  accountId: string,
  userId: string,
  name?: string
): Promise<MarketingCampaignRow> {
  const rows = await sql`
    INSERT INTO marketing_campaigns (account_id, name, created_by, status, current_step)
    VALUES (
      ${accountId}::uuid,
      ${name?.trim() || 'Untitled Campaign'},
      ${userId}::uuid,
      'draft',
      1
    )
    RETURNING id, name, status, current_step as "currentStep",
              created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt",
              launched_by as "launchedBy", launched_at as "launchedAt"
  `;
  return serializeCampaign(rows[0] as Record<string, unknown>, 0);
}

export async function getMarketingCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<MarketingCampaignRow | null> {
  const rows = await sql`
    SELECT c.id, c.name, c.status, c.current_step as "currentStep",
           c.created_by as "createdBy", c.created_at as "createdAt", c.updated_at as "updatedAt",
           c.launched_by as "launchedBy", c.launched_at as "launchedAt",
           COALESCE(r.cnt, 0)::int as "recipientCount"
    FROM marketing_campaigns c
    LEFT JOIN (
      SELECT campaign_id, COUNT(*)::int as cnt
      FROM marketing_campaign_recipients
      WHERE campaign_id = ${campaignId}::uuid
      GROUP BY campaign_id
    ) r ON r.campaign_id = c.id
    WHERE c.id = ${campaignId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const row = rows[0] as Record<string, unknown>;
  return serializeCampaign(row, Number(row.recipientCount ?? 0));
}

export async function patchMarketingCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  patch: { name?: string; currentStep?: number }
): Promise<MarketingCampaignRow> {
  const existing = await getMarketingCampaign(sql, accountId, campaignId);
  if (!existing) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND);
  }
  if (existing.status !== 'draft') {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Only draft campaigns can be edited in the wizard.',
    });
  }

  const name = patch.name !== undefined ? patch.name.trim() || 'Untitled Campaign' : existing.name;
  const currentStep =
    patch.currentStep !== undefined
      ? Math.min(4, Math.max(1, patch.currentStep))
      : existing.currentStep;

  const rows = await sql`
    UPDATE marketing_campaigns
    SET name = ${name},
        current_step = ${currentStep},
        updated_at = now()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, status, current_step as "currentStep",
              created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt",
              launched_by as "launchedBy", launched_at as "launchedAt"
  `;
  return serializeCampaign(rows[0] as Record<string, unknown>, existing.recipientCount);
}
