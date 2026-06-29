import type { AppSql } from '@/lib/db-sql';
import {
  type CampaignStepMergeConfig,
  validateCampaignStepDrafts,
} from '@/lib/marketing/campaign-step-draft';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { htmlToPlainText } from '@/lib/marketing/merge-tags';
import { getMarketingCampaign } from '@/lib/marketing/s6m-campaigns';

export type CampaignStepRow = {
  id: string;
  stepOrder: number;
  sendAt: string | null;
  subject: string;
  htmlBody: string;
  plainBody: string | null;
  mergeConfig: CampaignStepMergeConfig;
  saveAsTemplate: boolean;
  templateName: string | null;
  sourceTemplateId: string | null;
};

export type PutCampaignStepInput = {
  stepOrder: number;
  sendAt: string;
  subject: string;
  htmlBody: string;
  plainBody?: string;
  mergeConfig?: CampaignStepMergeConfig;
  saveAsTemplate?: boolean;
  templateName?: string;
  sourceTemplateId?: string | null;
};

function parseMergeConfig(raw: unknown): CampaignStepMergeConfig {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const mode = obj.contact_message_mode ?? obj.contactMessageMode;
  if (
    mode === 'latest_note' ||
    mode === 'latest_inbound_chat' ||
    mode === 'latest_note_or_chat'
  ) {
    return { contactMessageMode: mode };
  }
  return {};
}

function serializeStep(row: Record<string, unknown>): CampaignStepRow {
  return {
    id: row.id as string,
    stepOrder: Number(row.stepOrder),
    sendAt: row.sendAt ? new Date(row.sendAt as Date).toISOString() : null,
    subject: row.subject as string,
    htmlBody: row.htmlBody as string,
    plainBody: (row.plainBody as string | null) ?? null,
    mergeConfig: parseMergeConfig(row.mergeConfig),
    saveAsTemplate: Boolean(row.saveAsTemplate),
    templateName: (row.templateName as string | null) ?? null,
    sourceTemplateId: (row.sourceTemplateId as string | null) ?? null,
  };
}

export async function getCampaignSteps(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<CampaignStepRow[]> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Campaign not found' });
  }

  const rows = await sql`
    SELECT
      id,
      step_order as "stepOrder",
      send_at as "sendAt",
      subject,
      html_body as "htmlBody",
      plain_body as "plainBody",
      merge_config as "mergeConfig",
      save_as_template as "saveAsTemplate",
      template_name as "templateName",
      source_template_id as "sourceTemplateId"
    FROM marketing_campaign_steps
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY step_order ASC
  `;

  return (rows as Record<string, unknown>[]).map(serializeStep);
}

async function invalidateTestIfStep1Changed(
  sql: AppSql,
  campaignId: string,
  accountId: string,
  existingSteps: CampaignStepRow[],
  incoming: PutCampaignStepInput[]
) {
  const step1Existing = existingSteps.find((s) => s.stepOrder === 1);
  const step1Incoming = incoming.find((s) => s.stepOrder === 1);
  if (!step1Existing || !step1Incoming) return;

  const contentChanged =
    step1Existing.subject !== step1Incoming.subject.trim() ||
    step1Existing.htmlBody !== step1Incoming.htmlBody;

  if (!contentChanged) return;

  await sql`
    UPDATE marketing_campaigns
    SET test_sent_at = NULL,
        test_sent_by = NULL,
        test_sent_to = NULL,
        updated_at = NOW()
    WHERE id = ${campaignId}::uuid
      AND account_id = ${accountId}::uuid
      AND test_sent_at IS NOT NULL
  `;
}

/** S6M-13: persist checked steps as library templates (on save or at launch). */
export async function persistCampaignStepTemplates(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<number> {
  const rows = await sql`
    SELECT
      id,
      subject,
      html_body as "htmlBody",
      plain_body as "plainBody",
      save_as_template as "saveAsTemplate",
      template_name as "templateName",
      source_template_id as "sourceTemplateId"
    FROM marketing_campaign_steps
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY step_order ASC
  `;

  let created = 0;
  for (const raw of rows as Record<string, unknown>[]) {
    const saveAsTemplate = Boolean(raw.saveAsTemplate);
    const templateName = (raw.templateName as string | null)?.trim();
    if (!saveAsTemplate || !templateName) continue;

    const stepId = raw.id as string;
    const subject = (raw.subject as string).trim();
    const htmlBody = raw.htmlBody as string;
    const plainBody = (raw.plainBody as string | null) ?? htmlToPlainText(htmlBody);
    const sourceTemplateId = raw.sourceTemplateId as string | null;

    if (sourceTemplateId) {
      await sql`
        UPDATE email_templates
        SET name = ${templateName},
            subject = ${subject},
            html_body = ${htmlBody},
            text_body = ${plainBody},
            updated_at = NOW()
        WHERE id = ${sourceTemplateId}::uuid AND account_id = ${accountId}::uuid
      `;
    } else {
      const inserted = await sql`
        INSERT INTO email_templates (account_id, name, subject, html_body, text_body)
        VALUES (
          ${accountId}::uuid,
          ${templateName},
          ${subject},
          ${htmlBody},
          ${plainBody}
        )
        RETURNING id
      `;
      const templateId = (inserted[0] as { id: string }).id;
      await sql`
        UPDATE marketing_campaign_steps
        SET source_template_id = ${templateId}::uuid, updated_at = NOW()
        WHERE id = ${stepId}::uuid
      `;
      created += 1;
    }

    await sql`
      UPDATE marketing_campaign_steps
      SET save_as_template = false, updated_at = NOW()
      WHERE id = ${stepId}::uuid
    `;
  }

  return created;
}

export async function putCampaignSteps(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  steps: PutCampaignStepInput[]
): Promise<CampaignStepRow[]> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Campaign not found' });
  }
  if (campaign.status !== 'draft') {
    throw new MarketingError(MarketingErrorCode.CONFLICT, {
      message: 'Sequence can only be edited while the campaign is a draft.',
    });
  }

  const normalized = steps
    .map((s) => ({
      stepOrder: s.stepOrder,
      sendAt: s.sendAt,
      subject: s.subject.trim(),
      htmlBody: s.htmlBody,
      plainBody: s.plainBody?.trim() || htmlToPlainText(s.htmlBody),
      mergeConfig: s.mergeConfig ?? {},
      saveAsTemplate: Boolean(s.saveAsTemplate),
      templateName: s.templateName?.trim() ?? '',
      sourceTemplateId: s.sourceTemplateId ?? null,
    }))
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const fieldErrors = validateCampaignStepDrafts(normalized);
  if (fieldErrors.length > 0) {
    const hasSchedule = fieldErrors.some((e) => e.field === 'send_at');
    throw new MarketingError(
      hasSchedule ? MarketingErrorCode.SCHEDULE_INVALID : MarketingErrorCode.MERGE_VALIDATION_FAILED,
      { details: { fieldErrors } }
    );
  }

  const existingSteps = await getCampaignSteps(sql, accountId, campaignId);
  await invalidateTestIfStep1Changed(sql, campaignId, accountId, existingSteps, normalized);

  await sql`DELETE FROM marketing_campaign_steps WHERE campaign_id = ${campaignId}::uuid`;

  for (const step of normalized) {
    const mergeJson = JSON.stringify({
      contact_message_mode: step.mergeConfig.contactMessageMode ?? null,
    });
    await sql`
      INSERT INTO marketing_campaign_steps (
        campaign_id,
        step_order,
        send_at,
        subject,
        html_body,
        plain_body,
        merge_config,
        save_as_template,
        template_name,
        source_template_id
      )
      VALUES (
        ${campaignId}::uuid,
        ${step.stepOrder},
        ${step.sendAt}::timestamptz,
        ${step.subject},
        ${step.htmlBody},
        ${step.plainBody},
        ${mergeJson}::jsonb,
        ${step.saveAsTemplate},
        ${step.templateName || null},
        ${step.sourceTemplateId}::uuid
      )
    `;
  }

  await persistCampaignStepTemplates(sql, accountId, campaignId);

  await sql`
    UPDATE marketing_campaigns SET updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
  `;

  return getCampaignSteps(sql, accountId, campaignId);
}
