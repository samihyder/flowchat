import type { AccountSettings } from '@/lib/account-settings';
import { getAccountSettings } from '@/lib/account-settings-db';
import type { AppSql } from '@/lib/db-sql';
import { sendMarketingEmail } from '@/lib/marketing/email-send';
import { applyMergeTags } from '@/lib/marketing/merge-tags';

const BATCH_SIZE = Number(process.env.MARKETING_BATCH_SIZE ?? 25);

type DueStepRow = {
  stepRowId: string;
  campaignId: string;
  accountId: string;
  recipientId: string;
  contactId: string;
  email: string;
  stepOrder: number;
  subject: string;
  htmlBody: string;
  plainBody: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  credentialId: string | null;
};

async function logActivity(
  sql: AppSql,
  campaignId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
  recipientId?: string
) {
  await sql`
    INSERT INTO marketing_campaign_activity (campaign_id, recipient_id, event_type, payload)
    VALUES (
      ${campaignId}::uuid,
      ${recipientId ?? null}::uuid,
      ${eventType},
      ${JSON.stringify(payload)}::jsonb
    )
  `;
}

async function maybeCompleteCampaign(sql: AppSql, campaignId: string) {
  const pending = await sql`
    SELECT COUNT(*)::int as n FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending'
  `;
  if ((pending[0] as { n: number }).n > 0) return;

  await sql`
    UPDATE marketing_campaigns
    SET status = 'completed', updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND status IN ('running', 'scheduled', 'paused')
  `;
  await logActivity(sql, campaignId, 'campaign_completed', {});
}

export async function processS6mCampaignBatch(
  sql: AppSql,
  batchSize = BATCH_SIZE
): Promise<{ processed: number; sent: number; failed: number }> {
  const due = await sql`
    SELECT
      rs.id as "stepRowId",
      rs.campaign_id as "campaignId",
      c.account_id as "accountId",
      rs.recipient_id as "recipientId",
      r.contact_id as "contactId",
      r.email,
      s.step_order as "stepOrder",
      s.subject,
      s.html_body as "htmlBody",
      s.plain_body as "plainBody",
      c.from_name as "fromName",
      c.from_email as "fromEmail",
      c.reply_to as "replyTo",
      c.credential_id as "credentialId"
    FROM marketing_campaign_recipient_steps rs
    INNER JOIN marketing_campaigns c ON c.id = rs.campaign_id
    INNER JOIN marketing_campaign_recipients r ON r.id = rs.recipient_id
    INNER JOIN marketing_campaign_steps s ON s.id = rs.campaign_step_id
    WHERE rs.status = 'pending'
      AND rs.scheduled_at IS NOT NULL
      AND rs.scheduled_at <= NOW()
      AND c.status IN ('running', 'scheduled')
      AND r.stopped_reason IS NULL
    ORDER BY rs.scheduled_at ASC
    LIMIT ${batchSize}
  `;

  const rows = due as DueStepRow[];
  if (!rows.length) return { processed: 0, sent: 0, failed: 0 };

  const settingsCache = new Map<string, AccountSettings>();
  let sent = 0;
  let failed = 0;
  const touchedCampaigns = new Set<string>();

  for (const row of rows) {
    touchedCampaigns.add(row.campaignId);

    const priorPending = await sql`
      SELECT COUNT(*)::int as n
      FROM marketing_campaign_recipient_steps rs
      INNER JOIN marketing_campaign_steps s ON s.id = rs.campaign_step_id
      WHERE rs.recipient_id = ${row.recipientId}::uuid
        AND s.step_order < ${row.stepOrder}
        AND rs.status NOT IN ('sent', 'delivered', 'opened', 'clicked', 'skipped')
    `;
    if ((priorPending[0] as { n: number }).n > 0) continue;

    let settings = settingsCache.get(row.accountId);
    if (!settings) {
      settings = await getAccountSettings(sql, row.accountId);
      settingsCache.set(row.accountId, settings);
    }

    const contacts = await sql`
      SELECT name, email, phone, type, custom_attributes as "customAttributes"
      FROM contacts WHERE id = ${row.contactId}::uuid LIMIT 1
    `;
    const contact = contacts[0] as {
      name: string;
      email: string | null;
      phone: string | null;
      type: string;
      customAttributes: Record<string, unknown> | null;
    } | undefined;

    const mergeCtx = {
      name: contact?.name ?? row.email,
      email: row.email,
      phone: contact?.phone ?? null,
      type: (contact?.type ?? 'lead') as 'visitor' | 'lead' | 'customer',
      customAttributes: contact?.customAttributes ?? {},
    };

    const result = await sendMarketingEmail(sql, row.accountId, row.contactId, settings, {
      to: row.email,
      subject: applyMergeTags(row.subject, mergeCtx),
      html: applyMergeTags(row.htmlBody, mergeCtx),
      text: row.plainBody ? applyMergeTags(row.plainBody, mergeCtx) : undefined,
      credentialId: row.credentialId,
      mergeContact: mergeCtx,
      sender: {
        fromName: row.fromName ?? settings.marketingFromName ?? 'FlowChat',
        fromEmail: row.fromEmail ?? settings.marketingFromEmail ?? row.email,
        replyTo: row.replyTo ?? settings.marketingReplyTo ?? undefined,
        physicalAddress: settings.marketingPhysicalAddress ?? undefined,
      },
    });

    if (result.ok) {
      await sql`
        UPDATE marketing_campaign_recipient_steps
        SET status = 'sent', sent_at = NOW(), provider_message_id = ${result.messageId},
            updated_at = NOW()
        WHERE id = ${row.stepRowId}::uuid AND status = 'pending'
      `;
      await logActivity(
        sql,
        row.campaignId,
        'step_sent',
        { stepOrder: row.stepOrder, messageId: result.messageId },
        row.recipientId
      );
      sent++;
    } else {
      await sql`
        UPDATE marketing_campaign_recipient_steps
        SET status = 'failed', last_error_code = ${result.error.slice(0, 200)}, updated_at = NOW()
        WHERE id = ${row.stepRowId}::uuid AND status = 'pending'
      `;
      await logActivity(
        sql,
        row.campaignId,
        'step_failed',
        { stepOrder: row.stepOrder, error: result.error },
        row.recipientId
      );
      failed++;
    }
  }

  for (const campaignId of touchedCampaigns) {
    await maybeCompleteCampaign(sql, campaignId);
  }

  return { processed: sent + failed, sent, failed };
}

export async function skipPendingStepsForRecipient(
  sql: AppSql,
  recipientId: string,
  reason: string
) {
  await sql`
    UPDATE marketing_campaign_recipient_steps
    SET status = 'skipped', updated_at = NOW()
    WHERE recipient_id = ${recipientId}::uuid AND status = 'pending'
  `;
  await sql`
    UPDATE marketing_campaign_recipients
    SET stopped_reason = ${reason}, stopped_at = NOW()
    WHERE id = ${recipientId}::uuid AND stopped_reason IS NULL
  `;
}
