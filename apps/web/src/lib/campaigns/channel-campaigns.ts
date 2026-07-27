import type { AppSql } from '@/lib/db-sql';

export type ChannelCampaign = {
  id: string;
  accountId: string;
  name: string;
  channelType: string;
  inboxId: string | null;
  segmentId: string | null;
  templateName: string | null;
  templateBody: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChannelCampaignContact = {
  id: string;
  campaignId: string;
  contactId: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
};

type CampaignRow = {
  id: string;
  accountId: string;
  name: string;
  channelType: string;
  inboxId: string | null;
  segmentId: string | null;
  templateName: string | null;
  templateBody: string | null;
  status: string;
  scheduledAt: Date | string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: CampaignRow): ChannelCampaign {
  return {
    ...row,
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : null,
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listChannelCampaigns(
  sql: AppSql,
  accountId: string
): Promise<ChannelCampaign[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, channel_type as "channelType",
           inbox_id as "inboxId", segment_id as "segmentId",
           template_name as "templateName", template_body as "templateBody",
           status, scheduled_at as "scheduledAt", started_at as "startedAt",
           completed_at as "completedAt", created_by as "createdBy",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM channel_campaigns
    WHERE account_id = ${accountId}::uuid
    ORDER BY created_at DESC
  `;
  return (rows as CampaignRow[]).map(serialize);
}

export async function getChannelCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<ChannelCampaign | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, channel_type as "channelType",
           inbox_id as "inboxId", segment_id as "segmentId",
           template_name as "templateName", template_body as "templateBody",
           status, scheduled_at as "scheduledAt", started_at as "startedAt",
           completed_at as "completedAt", created_by as "createdBy",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM channel_campaigns
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as CampaignRow | undefined;
  return row ? serialize(row) : null;
}

export async function createChannelCampaign(
  sql: AppSql,
  accountId: string,
  userId: string | null,
  input: {
    name: string;
    channelType: string;
    inboxId?: string | null;
    segmentId?: string | null;
    templateName?: string | null;
    templateBody?: string | null;
    scheduledAt?: string | null;
    contactIds?: string[];
  }
): Promise<ChannelCampaign> {
  const rows = await sql`
    INSERT INTO channel_campaigns (
      account_id, name, channel_type, inbox_id, segment_id,
      template_name, template_body, scheduled_at, created_by
    )
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.channelType},
      ${input.inboxId ?? null}::uuid, ${input.segmentId ?? null}::uuid,
      ${input.templateName ?? null}, ${input.templateBody ?? null},
      ${input.scheduledAt ?? null}::timestamptz, ${userId}::uuid
    )
    RETURNING id, account_id as "accountId", name, channel_type as "channelType",
              inbox_id as "inboxId", segment_id as "segmentId",
              template_name as "templateName", template_body as "templateBody",
              status, scheduled_at as "scheduledAt", started_at as "startedAt",
              completed_at as "completedAt", created_by as "createdBy",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const campaign = serialize(rows[0] as CampaignRow);

  const contactIds = input.contactIds ?? [];
  if (contactIds.length > 0) {
    for (const contactId of contactIds) {
      await sql`
        INSERT INTO channel_campaign_contacts (campaign_id, contact_id)
        SELECT ${campaign.id}::uuid, c.id
        FROM contacts c
        WHERE c.id = ${contactId}::uuid AND c.account_id = ${accountId}::uuid
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return campaign;
}

export async function updateChannelCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  input: Partial<{
    name: string;
    channelType: string;
    inboxId: string | null;
    segmentId: string | null;
    templateName: string | null;
    templateBody: string | null;
    status: string;
    scheduledAt: string | null;
  }>
): Promise<ChannelCampaign | null> {
  const rows = await sql`
    UPDATE channel_campaigns SET
      name = COALESCE(${input.name ?? null}, name),
      channel_type = COALESCE(${input.channelType ?? null}, channel_type),
      inbox_id = COALESCE(${input.inboxId ?? null}::uuid, inbox_id),
      segment_id = COALESCE(${input.segmentId ?? null}::uuid, segment_id),
      template_name = COALESCE(${input.templateName ?? null}, template_name),
      template_body = COALESCE(${input.templateBody ?? null}, template_body),
      status = COALESCE(${input.status ?? null}, status),
      scheduled_at = COALESCE(${input.scheduledAt ?? null}::timestamptz, scheduled_at),
      updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, channel_type as "channelType",
              inbox_id as "inboxId", segment_id as "segmentId",
              template_name as "templateName", template_body as "templateBody",
              status, scheduled_at as "scheduledAt", started_at as "startedAt",
              completed_at as "completedAt", created_by as "createdBy",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as CampaignRow | undefined;
  return row ? serialize(row) : null;
}

export async function deleteChannelCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM channel_campaigns
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listCampaignContacts(
  sql: AppSql,
  campaignId: string
): Promise<ChannelCampaignContact[]> {
  const rows = await sql`
    SELECT id, campaign_id as "campaignId", contact_id as "contactId", status,
           provider_message_id as "providerMessageId", error_message as "errorMessage",
           sent_at as "sentAt"
    FROM channel_campaign_contacts
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY sent_at NULLS FIRST
  `;
  return (rows as ChannelCampaignContact[]).map((r) => ({
    ...r,
    sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
  }));
}

/** Marks campaign as sending but does not fake delivery — WA/SMS providers not wired yet. */
export async function dispatchChannelCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<{ sent: number; dispatched: number; campaign: ChannelCampaign | null; error?: string }> {
  const campaign = await getChannelCampaign(sql, accountId, campaignId);
  if (!campaign) return { sent: 0, dispatched: 0, campaign: null, error: 'Campaign not found' };

  await sql`
    UPDATE channel_campaigns SET
      status = 'failed', updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
      AND status IN ('draft', 'scheduled', 'sending')
  `;

  await sql`
    UPDATE channel_campaign_contacts SET
      status = 'failed',
      error_message = 'Channel provider dispatch is not implemented yet'
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending'
  `;

  const refreshed = await getChannelCampaign(sql, accountId, campaignId);
  return {
    sent: 0,
    dispatched: 0,
    campaign: refreshed,
    error: 'Channel provider dispatch is not implemented yet',
  };
}

export async function dispatchDueChannelCampaigns(sql: AppSql): Promise<number> {
  const scheduled = await sql`
    SELECT id, account_id as "accountId"
    FROM channel_campaigns
    WHERE status = 'scheduled'
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    LIMIT 20
  `;
  let count = 0;
  for (const row of scheduled as { id: string; accountId: string }[]) {
    await dispatchChannelCampaign(sql, row.accountId, row.id);
    count += 1;
  }
  return count;
}
