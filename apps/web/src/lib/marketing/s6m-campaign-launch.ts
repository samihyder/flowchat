import type { AccountSettings } from '@/lib/account-settings';
import type { AppSql } from '@/lib/db-sql';
import { resolveEmailCredential } from '@/lib/credentials/store';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { applyMergeTags } from '@/lib/marketing/merge-tags';
import { sendMarketingEmail } from '@/lib/marketing/email-send';
import { buildCampaignEmailAppendix } from '@/lib/marketing/campaign-appendix';
import { checkSenderDomainStatus, isMarketingDomainReady, marketingDomainStatusDetail } from '@/lib/marketing/senders';
import { getCampaignSteps, persistCampaignStepTemplates } from '@/lib/marketing/s6m-campaign-steps';
import { summarizeMergeValidationForSteps } from '@/lib/marketing/campaign-step-draft';
import {
  getCampaignSender,
  isTestSendValid,
} from '@/lib/marketing/s6m-campaign-sender';
import { getMarketingCampaign } from '@/lib/marketing/s6m-campaigns';
import { resolveRecipientScheduledAt } from '@/lib/marketing/campaign-schedule-time';
import { canLaunchCampaign } from '@/lib/marketing/permissions';
import { getAccountSettings } from '@/lib/account-settings-db';
import { getMarketingCronState, isCronHealthy } from '@/lib/marketing/marketing-cron-state';

export type PreflightCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export async function getCampaignPreflight(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  settings: AccountSettings
): Promise<{ checks: PreflightCheck[]; testValid: boolean; ready: boolean }> {
  const sender = await getCampaignSender(sql, accountId, campaignId);
  const testValid = isTestSendValid(sender);

  let providerOk = false;
  let providerDetail = 'No email provider configured';
  const cred = await resolveEmailCredential(sql, accountId, sender.credentialId);
  if (cred) {
    providerOk = cred.row.status === 'active';
    providerDetail = `Connected ${cred.row.provider} (${cred.row.label})`;
  } else if (process.env.RESEND_API_KEY) {
    providerOk = true;
    providerDetail = 'Platform Resend';
  }

  let domainOk = false;
  let domainDetail = 'From email not set';
  if (sender.fromEmail) {
    const status = await checkSenderDomainStatus(
      sql,
      accountId,
      sender.fromEmail,
      sender.credentialId
    );
    const usingPlatform = !cred && Boolean(process.env.RESEND_API_KEY);
    domainOk = isMarketingDomainReady(status, { usingPlatform, testSendValid: testValid });
    domainDetail = marketingDomainStatusDetail(status, sender.fromEmail, {
      usingPlatform,
      testSendValid: testValid,
    });
  }

  const cronState = await getMarketingCronState(sql);
  const cronOk =
    isCronHealthy(cronState) || process.env.NODE_ENV === 'development';
  const cronDetail = cronOk
    ? cronState.lastRunAt
      ? `Last run ${new Date(cronState.lastRunAt).toLocaleString()}`
      : process.env.NODE_ENV === 'development' && !cronState.lastRunAt
        ? 'Scheduler configured (dev — cron may not have run locally)'
        : 'Scheduler configured'
    : 'Background scheduler not running recently';

  const steps = await getCampaignSteps(sql, accountId, campaignId);
  const mergeSummary = summarizeMergeValidationForSteps(
    steps.map((s) => ({
      stepOrder: s.stepOrder,
      sendAt: s.sendAt ?? new Date(Date.now() + 3600_000).toISOString(),
      subject: s.subject,
      htmlBody: s.htmlBody,
      mergeConfig: s.mergeConfig,
    }))
  );

  const recipientRows = await sql`
    SELECT COUNT(*)::int as count FROM marketing_campaign_recipients
    WHERE campaign_id = ${campaignId}::uuid
  `;
  const recipientCount = Number((recipientRows[0] as { count: number }).count);
  const recipientsOk = recipientCount > 0;

  const checks: PreflightCheck[] = [
    { id: 'provider', label: 'Provider Connection', ok: providerOk, detail: providerDetail },
    { id: 'domain', label: 'Domain Verification', ok: domainOk, detail: domainDetail },
    { id: 'cron', label: 'Scheduler Health', ok: cronOk, detail: cronDetail },
    {
      id: 'recipients',
      label: 'Recipients selected',
      ok: recipientsOk,
      detail: recipientsOk
        ? `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} selected`
        : 'Select at least one recipient before launching',
    },
    {
      id: 'merge',
      label: 'Merge tags valid',
      ok: mergeSummary.ok,
      detail: mergeSummary.detail,
    },
    {
      id: 'test',
      label: 'Test email sent',
      ok: testValid,
      detail: testValid
        ? `Last test to ${sender.testSentTo}`
        : 'Send a test email before launching',
    },
  ];

  const ready = checks.every((c) => c.ok);
  return { checks, testValid, ready };
}

export async function sendCampaignTestEmail(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  userId: string,
  settings: AccountSettings,
  toEmail?: string
): Promise<{ sentTo: string }> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign || campaign.status !== 'draft') {
    throw new MarketingError(MarketingErrorCode.CONFLICT, {
      message: 'Test send is only available for draft campaigns.',
    });
  }

  const steps = await getCampaignSteps(sql, accountId, campaignId);
  const step1 = steps.find((s) => s.stepOrder === 1);
  if (!step1?.subject.trim() || !step1.htmlBody.trim()) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Complete email 1 in the sequence before sending a test.',
    });
  }

  const sender = await getCampaignSender(sql, accountId, campaignId);
  if (!sender.fromEmail) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Configure sender details before sending a test.',
    });
  }

  let to = toEmail?.trim();
  if (!to) {
    const users = await sql`SELECT email, name FROM users WHERE id = ${userId}::uuid LIMIT 1`;
    const user = users[0] as { email: string; name: string } | undefined;
    to = user?.email;
  }
  if (!to) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Recipient email is required.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Enter a valid email address for the test send.',
    });
  }

  const mergeCtx = {
    name: 'Alex',
    email: to,
    phone: null,
    type: 'lead' as const,
    customAttributes: {},
  };

  const cred = await resolveEmailCredential(sql, accountId, sender.credentialId);
  if (!cred) {
    if (settings.marketingByokOnly) {
      throw new MarketingError(MarketingErrorCode.VALIDATION, {
        message:
          'No connected email provider. Add Resend, SendGrid, or Mailgun under Settings → Connected services.',
      });
    }
    if (!process.env.RESEND_API_KEY) {
      throw new MarketingError(MarketingErrorCode.VALIDATION, {
        message:
          'No email provider is configured. Connect an email provider under Settings → Connected services.',
      });
    }
  }

  const domainStatus = await checkSenderDomainStatus(
    sql,
    accountId,
    sender.fromEmail,
    sender.credentialId
  );
  if (domainStatus === 'failed') {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: `The domain for ${sender.fromEmail} is not verified. Open Settings → Email marketing to verify your sender domain.`,
    });
  }

  let html = applyMergeTags(step1.htmlBody, mergeCtx);
  const appendix = buildCampaignEmailAppendix(
    settings,
    mergeCtx,
    {
      signatureHtml: sender.signatureHtml,
      useWorkspaceSignature: sender.useWorkspaceSignature,
      meetingLink: sender.meetingLink,
      portfolioLink: sender.portfolioLink,
    },
    {
      senderName: sender.fromName ?? undefined,
      senderEmail: sender.fromEmail ?? undefined,
    }
  );
  if (appendix) html = `${html}${appendix}`;

  const result = await sendMarketingEmail(sql, accountId, userId, settings, {
    to,
    subject: `[TEST] ${applyMergeTags(step1.subject, mergeCtx)}`,
    html,
    text: step1.plainBody ? applyMergeTags(step1.plainBody, mergeCtx) : undefined,
    credentialId: sender.credentialId,
    mergeContact: mergeCtx,
    isTest: true,
    skipAutoAppendix: true,
    sender: {
      fromName: sender.fromName ?? settings.marketingFromName ?? 'FlowChat',
      fromEmail: sender.fromEmail,
      replyTo: sender.replyTo ?? undefined,
      physicalAddress: settings.marketingPhysicalAddress ?? undefined,
    },
  });

  if (!result.ok) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: result.error ?? 'Test send failed. Check your email provider and sender domain in Settings.',
    });
  }

  await sql`
    UPDATE marketing_campaigns
    SET test_sent_at = NOW(),
        test_sent_by = ${userId}::uuid,
        test_sent_to = ${to},
        updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
  `;

  return { sentTo: to };
}

export async function launchMarketingCampaign(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  userId: string,
  role: string
): Promise<{ status: string; launchedAt: string }> {
  if (!canLaunchCampaign(role)) {
    throw new MarketingError(MarketingErrorCode.LAUNCH_FORBIDDEN);
  }

  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND);
  }
  if (campaign.status !== 'draft') {
    throw new MarketingError(MarketingErrorCode.CONFLICT, {
      message: 'Only draft campaigns can be launched.',
    });
  }

  const settings = await getAccountSettings(sql, accountId);
  const preflight = await getCampaignPreflight(sql, accountId, campaignId, settings);
  if (!preflight.ready) {
    throw new MarketingError(MarketingErrorCode.PREFLIGHT_FAILED, {
      details: { checks: preflight.checks },
    });
  }

  const steps = await getCampaignSteps(sql, accountId, campaignId);
  if (!steps.length) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Add at least one email to the sequence.',
    });
  }

  await persistCampaignStepTemplates(sql, accountId, campaignId);

  const firstSendAt = steps[0]?.sendAt ? new Date(steps[0].sendAt) : new Date();
  const status = firstSendAt.getTime() > Date.now() ? 'scheduled' : 'running';

  await sql`
    UPDATE marketing_campaign_steps
    SET snapshot_at = NOW(), updated_at = NOW()
    WHERE campaign_id = ${campaignId}::uuid
  `;

  const recipients = await sql`
    SELECT r.id, r.contact_id as "contactId", c.timezone
    FROM marketing_campaign_recipients r
    LEFT JOIN contacts c ON c.id = r.contact_id
    WHERE r.campaign_id = ${campaignId}::uuid
  `;

  const scheduleTimezone = campaign.scheduleTimezone || 'UTC';
  const scheduleMode = campaign.scheduleMode || 'recipient_local';

  for (const step of steps) {
    if (!step.sendAt) continue;
    for (const recipient of recipients as {
      id: string;
      contactId: string;
      timezone: string | null;
    }[]) {
      const scheduledAt = resolveRecipientScheduledAt(
        step.sendAt,
        scheduleTimezone,
        recipient.timezone,
        scheduleMode
      );
      await sql`
        INSERT INTO marketing_campaign_recipient_steps (
          campaign_id, campaign_step_id, recipient_id, status, scheduled_at
        )
        VALUES (
          ${campaignId}::uuid,
          ${step.id}::uuid,
          ${recipient.id}::uuid,
          'pending',
          ${scheduledAt}::timestamptz
        )
        ON CONFLICT (recipient_id, campaign_step_id) DO NOTHING
      `;
    }
  }

  const rows = await sql`
    UPDATE marketing_campaigns
    SET status = ${status},
        launched_by = ${userId}::uuid,
        launched_at = NOW(),
        updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    RETURNING launched_at as "launchedAt", status
  `;

  const row = rows[0] as { launchedAt: Date; status: string };
  return {
    status: row.status,
    launchedAt: new Date(row.launchedAt).toISOString(),
  };
}
