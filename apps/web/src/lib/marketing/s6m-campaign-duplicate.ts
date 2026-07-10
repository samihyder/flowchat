import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { getCampaignSteps } from '@/lib/marketing/s6m-campaign-steps';
import {
  getMarketingCampaign,
  type MarketingCampaignRow,
} from '@/lib/marketing/s6m-campaigns';

function copyName(name: string): string {
  const base = name.replace(/\s+\(copy\)$/i, '').trim() || 'Untitled Campaign';
  return `${base} (copy)`;
}

export async function duplicateMarketingCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  userId: string
): Promise<MarketingCampaignRow> {
  const source = await getMarketingCampaign(sql, accountId, campaignId);
  if (!source) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND);
  }

  const steps = await getCampaignSteps(sql, accountId, campaignId).catch(() => []);

  const rows = await sql`
    INSERT INTO marketing_campaigns (
      account_id, name, status, current_step, created_by,
      from_name, from_email, reply_to, signature_html, use_workspace_signature,
      meeting_link, portfolio_link, credential_id,
      schedule_timezone, schedule_mode,
      send_rate_enabled, send_rate_per_hour, auto_mark_bounced, process_unsubscribes
    )
    SELECT
      account_id,
      ${copyName(source.name)},
      'draft',
      2,
      ${userId}::uuid,
      from_name, from_email, reply_to, signature_html, use_workspace_signature,
      meeting_link, portfolio_link, credential_id,
      schedule_timezone, schedule_mode,
      send_rate_enabled, send_rate_per_hour, auto_mark_bounced, process_unsubscribes
    FROM marketing_campaigns
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, status, current_step as "currentStep",
              created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt",
              launched_by as "launchedBy", launched_at as "launchedAt"
  `;

  const newRow = rows[0] as Record<string, unknown>;
  const newId = newRow.id as string;

  for (const step of steps) {
    await sql`
      INSERT INTO marketing_campaign_steps (
        campaign_id, step_order, send_at, subject, html_body, plain_body,
        merge_config, save_as_template, template_name, source_template_id
      )
      VALUES (
        ${newId}::uuid,
        ${step.stepOrder},
        NULL,
        ${step.subject},
        ${step.htmlBody},
        ${step.plainBody},
        ${JSON.stringify(step.mergeConfig)}::jsonb,
        ${step.saveAsTemplate},
        ${step.templateName},
        ${step.sourceTemplateId}::uuid
      )
    `;
  }

  await sql`
    INSERT INTO marketing_campaign_activity (campaign_id, event_type, payload)
    VALUES (
      ${newId}::uuid,
      'campaign_duplicated',
      ${JSON.stringify({ sourceCampaignId: campaignId })}::jsonb
    )
  `;

  return {
    id: newId,
    name: newRow.name as string,
    status: 'draft',
    currentStep: 2,
    createdBy: userId,
    createdByName: null,
    stepCount: steps.length,
    createdAt: new Date(newRow.createdAt as Date).toISOString(),
    updatedAt: new Date(newRow.updatedAt as Date).toISOString(),
    launchedBy: null,
    launchedAt: null,
    recipientCount: 0,
    scheduleTimezone: source.scheduleTimezone,
    scheduleMode: source.scheduleMode,
    nextScheduledAt: null,
    firstSendAt: null,
    sendRateEnabled: source.sendRateEnabled,
    sendRatePerHour: source.sendRatePerHour,
    autoMarkBounced: source.autoMarkBounced,
    processUnsubscribes: source.processUnsubscribes,
  };
}
