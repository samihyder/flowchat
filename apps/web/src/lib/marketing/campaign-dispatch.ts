import type { AppSql } from '@/lib/db-sql';
import { getAccountSettings } from '@/lib/account-settings-db';
import { applyMergeTags } from '@/lib/marketing/merge-tags';
import { sendMarketingEmail } from '@/lib/marketing/email-send';
import { resolveSegmentContacts } from '@/lib/marketing/segments';
import { isInSendWindow, resolveContactTimezone } from '@/lib/marketing/send-time';

export async function scheduleCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  scheduledAt: Date
) {
  const rows = await sql`
    UPDATE email_campaigns SET status = 'scheduled', scheduled_at = ${scheduledAt.toISOString()}::timestamptz, updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid AND status = 'draft'
    RETURNING id
  `;
  if (!rows[0]) throw new Error('Campaign not found or cannot be scheduled');
}

export async function pauseCampaign(sql: AppSql, accountId: string, campaignId: string) {
  await sql`
    UPDATE email_campaigns SET status = 'paused', updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid AND status = 'sending'
  `;
}

export async function cancelCampaign(sql: AppSql, accountId: string, campaignId: string) {
  await sql`
    UPDATE email_campaigns SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
      AND status IN ('draft', 'scheduled', 'sending', 'paused')
  `;
}

export async function prepareCampaignSend(sql: AppSql, accountId: string, campaignId: string) {
  const campaigns = await sql`
    SELECT id, segment_id as "segmentId", template_id as "templateId", subject, status,
           ab_test_enabled as "abTestEnabled", subject_variant_b as "subjectVariantB"
    FROM email_campaigns
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const campaign = campaigns[0] as
    | {
        segmentId: string | null;
        templateId: string | null;
        subject: string;
        status: string;
        abTestEnabled: boolean;
        subjectVariantB: string | null;
      }
    | undefined;
  if (!campaign) throw new Error('Campaign not found');
  if (!campaign.segmentId || !campaign.templateId) {
    throw new Error('Campaign requires a segment and template');
  }
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error('Campaign cannot be sent in current status');
  }
  if (campaign.abTestEnabled && !campaign.subjectVariantB?.trim()) {
    throw new Error('A/B test requires subject variant B');
  }

  const templates = await sql`
    SELECT subject, html_body as "htmlBody", text_body as "textBody"
    FROM email_templates WHERE id = ${campaign.templateId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!templates[0]) throw new Error('Template not found');

  const contacts = await resolveSegmentContacts(sql, accountId, campaign.segmentId);
  await sql`DELETE FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid`;

  let i = 0;
  for (const c of contacts) {
    const variant = campaign.abTestEnabled ? (i % 2 === 0 ? 'A' : 'B') : null;
    await sql`
      INSERT INTO email_campaign_recipients (campaign_id, contact_id, email, status, ab_variant)
      VALUES (${campaignId}::uuid, ${c.id}::uuid, ${c.email}, 'queued', ${variant})
    `;
    i++;
  }

  await sql`
    UPDATE email_campaigns SET
      status = 'sending',
      started_at = NOW(),
      total_recipients = ${contacts.length},
      sent_count = 0,
      delivered_count = 0,
      opened_count = 0,
      clicked_count = 0,
      bounced_count = 0,
      complained_count = 0,
      unsubscribed_count = 0,
      failed_count = 0,
      ab_test_phase = ${campaign.abTestEnabled ? 'testing' : 'none'},
      updated_at = NOW()
    WHERE id = ${campaignId}::uuid
  `;

  return { totalRecipients: contacts.length };
}

export async function pickAbTestWinner(sql: AppSql, accountId: string, campaignId: string) {
  const rows = await sql`
    SELECT ab_test_enabled as "abTestEnabled", ab_test_phase as "abTestPhase",
           ab_winner_after_hours as "abWinnerAfterHours", started_at as "startedAt"
    FROM email_campaigns
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const c = rows[0] as {
    abTestEnabled: boolean;
    abTestPhase: string;
    abWinnerAfterHours: number;
    startedAt: Date | null;
  } | undefined;
  if (!c?.abTestEnabled || c.abTestPhase !== 'testing' || !c.startedAt) return;

  const elapsed = Date.now() - new Date(c.startedAt).getTime();
  if (elapsed < c.abWinnerAfterHours * 3600 * 1000) return;

  const stats = await getCampaignAbStats(sql, campaignId);
  if (stats.length < 2) return;

  const scored = stats.map((s) => ({
    variant: s.variant,
    rate: s.sent > 0 ? s.opened / s.sent : 0,
  }));
  scored.sort((a, b) => b.rate - a.rate);
  const winner = scored[0]?.variant;
  if (!winner) return;

  await sql`
    UPDATE email_campaigns SET ab_winner_variant = ${winner}, ab_test_phase = 'winner_sent', updated_at = NOW()
    WHERE id = ${campaignId}::uuid
  `;
  await sql`
    UPDATE email_campaign_recipients SET ab_variant = ${winner}
    WHERE campaign_id = ${campaignId}::uuid AND status = 'queued'
  `;
}

export async function processCampaignBatch(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  batchSize = 25
): Promise<{ done: boolean; processed: number }> {
  const statusRows = await sql`
    SELECT status FROM email_campaigns WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  const status = (statusRows[0] as { status: string } | undefined)?.status;
  if (status === 'paused' || status === 'cancelled') {
    return { done: false, processed: 0 };
  }

  const settings = await getAccountSettings(sql, accountId);
  const accountRows = await sql`SELECT timezone FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const accountTz = (accountRows[0] as { timezone: string } | undefined)?.timezone ?? 'UTC';

  const campaigns = await sql`
    SELECT c.id, c.subject, c.subject_variant_b as "subjectVariantB", c.ab_winner_variant as "abWinnerVariant",
           c.ab_test_phase as "abTestPhase", c.use_send_time_optimization as "useSendTimeOptimization",
           c.send_window_start as "sendWindowStart", c.send_window_end as "sendWindowEnd",
           c.sender_id as "senderId", t.html_body as "htmlBody", t.text_body as "textBody"
    FROM email_campaigns c
    LEFT JOIN email_templates t ON t.id = c.template_id
    WHERE c.id = ${campaignId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const campaign = campaigns[0] as
    | {
        subject: string;
        subjectVariantB: string | null;
        abWinnerVariant: string | null;
        abTestPhase: string;
        useSendTimeOptimization: boolean;
        sendWindowStart: number;
        sendWindowEnd: number;
        senderId: string | null;
        htmlBody: string;
        textBody: string | null;
      }
    | undefined;
  if (!campaign?.htmlBody) throw new Error('Campaign not found');

  const recipients = await sql`
    SELECT r.id, r.contact_id as "contactId", r.email, r.ab_variant as "abVariant",
           c.name, c.phone, c.type, c.timezone, c.marketing_preference as "marketingPreference",
           c.custom_attributes as "customAttributes"
    FROM email_campaign_recipients r
    LEFT JOIN contacts c ON c.id = r.contact_id
    WHERE r.campaign_id = ${campaignId}::uuid AND r.status = 'queued'
    LIMIT ${batchSize * 3}
  `;

  let processed = 0;
  let sentThisBatch = 0;
  for (const row of recipients as {
    id: string;
    contactId: string | null;
    email: string;
    abVariant: string | null;
    name: string | null;
    phone: string | null;
    type: string | null;
    timezone: string | null;
    marketingPreference: string;
    customAttributes: Record<string, unknown> | null;
  }[]) {
    if (sentThisBatch >= batchSize) break;

    if (!row.contactId) {
      await sql`
        UPDATE email_campaign_recipients SET status = 'skipped', error_message = 'Missing contact'
        WHERE id = ${row.id}::uuid
      `;
      processed++;
      continue;
    }

    if (row.marketingPreference === 'none' || row.marketingPreference === 'reduced') {
      await sql`
        UPDATE email_campaign_recipients SET status = 'skipped', error_message = 'Preference opt-down'
        WHERE id = ${row.id}::uuid
      `;
      processed++;
      continue;
    }

    if (campaign.useSendTimeOptimization) {
      const tz = resolveContactTimezone(row.timezone, accountTz);
      if (!isInSendWindow(tz, campaign.sendWindowStart, campaign.sendWindowEnd)) {
        continue;
      }
    }

    let baseSubject = campaign.subject;
    if (campaign.abTestPhase === 'winner_sent' && campaign.abWinnerVariant === 'B' && campaign.subjectVariantB) {
      baseSubject = campaign.subjectVariantB;
    } else if (row.abVariant === 'B' && campaign.subjectVariantB) {
      baseSubject = campaign.subjectVariantB;
    }
    const mergeCtx = {
      name: row.name ?? 'there',
      email: row.email,
      phone: row.phone,
      type: row.type ?? undefined,
      customAttributes: row.customAttributes ?? {},
    };
    const subject = applyMergeTags(baseSubject, mergeCtx);
    const html = applyMergeTags(campaign.htmlBody, mergeCtx);
    const text = campaign.textBody ? applyMergeTags(campaign.textBody, mergeCtx) : undefined;

    const result = await sendMarketingEmail(sql, accountId, row.contactId, settings, {
      to: row.email,
      subject,
      html,
      text,
      senderId: campaign.senderId,
    });

    if (result.ok) {
      await sql`
        UPDATE email_campaign_recipients SET
          status = 'sent',
          resend_message_id = ${result.messageId},
          sent_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
      await sql`
        INSERT INTO contact_email_events (account_id, contact_id, campaign_id, event_type, subject, metadata)
        VALUES (
          ${accountId}::uuid,
          ${row.contactId}::uuid,
          ${campaignId}::uuid,
          'sent',
          ${subject},
          ${JSON.stringify({ resendMessageId: result.messageId, abVariant: row.abVariant })}::jsonb
        )
      `;
      await sql`
        UPDATE email_campaigns SET sent_count = sent_count + 1, updated_at = NOW()
        WHERE id = ${campaignId}::uuid
      `;
    } else {
      await sql`
        UPDATE email_campaign_recipients SET status = 'failed', error_message = ${result.error}
        WHERE id = ${row.id}::uuid
      `;
      await sql`
        UPDATE email_campaigns SET failed_count = failed_count + 1, updated_at = NOW()
        WHERE id = ${campaignId}::uuid
      `;
    }
    processed++;
    sentThisBatch++;
  }

  const remaining = await sql`
    SELECT COUNT(*)::int as count FROM email_campaign_recipients
    WHERE campaign_id = ${campaignId}::uuid AND status = 'queued'
  `;
  const left = (remaining[0] as { count: number }).count;
  const done = left === 0;

  if (done) {
    await sql`
      UPDATE email_campaigns SET status = 'sent', completed_at = NOW(), updated_at = NOW()
      WHERE id = ${campaignId}::uuid
    `;
    await refreshCampaignStats(sql, campaignId);
  }

  return { done, processed };
}

export async function refreshCampaignStats(sql: AppSql, campaignId: string) {
  await sql`
    UPDATE email_campaigns SET
      delivered_count = (SELECT COUNT(*)::int FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid AND status IN ('delivered','opened','clicked')),
      opened_count = (SELECT COUNT(*)::int FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid AND opened_at IS NOT NULL),
      clicked_count = (SELECT COUNT(*)::int FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid AND clicked_at IS NOT NULL),
      bounced_count = (SELECT COUNT(*)::int FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid AND status = 'bounced'),
      complained_count = (SELECT COUNT(*)::int FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid AND status = 'complained'),
      failed_count = (SELECT COUNT(*)::int FROM email_campaign_recipients WHERE campaign_id = ${campaignId}::uuid AND status = 'failed'),
      updated_at = NOW()
    WHERE id = ${campaignId}::uuid
  `;
}

export function campaignRates(campaign: {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  failedCount: number;
}) {
  const sent = campaign.sentCount || 0;
  const delivered = campaign.deliveredCount || sent;
  const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 1000) / 10 : 0);
  return {
    openRate: pct(campaign.openedCount, delivered),
    clickRate: pct(campaign.clickedCount, delivered),
    bounceRate: pct(campaign.bouncedCount, sent),
    unsubscribeRate: pct(campaign.unsubscribedCount, delivered),
    deliveryRate: pct(delivered, sent),
    complaintRate: pct(campaign.complainedCount, sent),
  };
}

export async function getCampaignAbStats(sql: AppSql, campaignId: string) {
  const rows = await sql`
    SELECT ab_variant as "variant",
           COUNT(*)::int as sent,
           COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int as opened
    FROM email_campaign_recipients
    WHERE campaign_id = ${campaignId}::uuid AND ab_variant IS NOT NULL
    GROUP BY ab_variant
  `;
  return rows as { variant: string; sent: number; opened: number }[];
}
