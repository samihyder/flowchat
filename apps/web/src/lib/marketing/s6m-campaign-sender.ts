import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { getMarketingCampaign } from '@/lib/marketing/s6m-campaigns';

export type CampaignSenderConfig = {
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  signatureHtml: string | null;
  useWorkspaceSignature: boolean;
  meetingLink: string | null;
  portfolioLink: string | null;
  credentialId: string | null;
  testSentAt: string | null;
  testSentBy: string | null;
  testSentTo: string | null;
};

export type PutCampaignSenderInput = {
  senderId?: string | null;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string | null;
  signatureHtml?: string | null;
  useWorkspaceSignature?: boolean;
  meetingLink?: string | null;
  portfolioLink?: string | null;
};

async function fetchSenderRow(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<Record<string, unknown> | null> {
  const rows = await sql`
    SELECT
      from_name as "fromName",
      from_email as "fromEmail",
      reply_to as "replyTo",
      signature_html as "signatureHtml",
      use_workspace_signature as "useWorkspaceSignature",
      meeting_link as "meetingLink",
      portfolio_link as "portfolioLink",
      credential_id as "credentialId",
      test_sent_at as "testSentAt",
      test_sent_by as "testSentBy",
      test_sent_to as "testSentTo"
    FROM marketing_campaigns
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

function serializeSender(row: Record<string, unknown>): CampaignSenderConfig {
  return {
    fromName: (row.fromName as string | null) ?? null,
    fromEmail: (row.fromEmail as string | null) ?? null,
    replyTo: (row.replyTo as string | null) ?? null,
    signatureHtml: (row.signatureHtml as string | null) ?? null,
    useWorkspaceSignature: row.useWorkspaceSignature !== false,
    meetingLink: (row.meetingLink as string | null) ?? null,
    portfolioLink: (row.portfolioLink as string | null) ?? null,
    credentialId: (row.credentialId as string | null) ?? null,
    testSentAt: row.testSentAt ? new Date(row.testSentAt as Date).toISOString() : null,
    testSentBy: (row.testSentBy as string | null) ?? null,
    testSentTo: (row.testSentTo as string | null) ?? null,
  };
}

export async function getCampaignSender(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<CampaignSenderConfig> {
  const row = await fetchSenderRow(sql, accountId, campaignId);
  if (!row) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Campaign not found' });
  }
  return serializeSender(row);
}

export async function putCampaignSender(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  input: PutCampaignSenderInput
): Promise<CampaignSenderConfig> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Campaign not found' });
  }
  if (campaign.status !== 'draft') {
    throw new MarketingError(MarketingErrorCode.CONFLICT, {
      message: 'Sender can only be edited while the campaign is a draft.',
    });
  }

  const existing = await getCampaignSender(sql, accountId, campaignId);

  let fromName = input.fromName?.trim() ?? existing.fromName ?? '';
  let fromEmail = input.fromEmail?.trim() ?? existing.fromEmail ?? '';
  let replyTo = input.replyTo !== undefined ? input.replyTo?.trim() || null : existing.replyTo;
  let credentialId = existing.credentialId;

  if (input.senderId) {
    const senderRows = await sql`
      SELECT from_name as "fromName", from_email as "fromEmail", reply_to as "replyTo",
             credential_id as "credentialId"
      FROM marketing_senders
      WHERE id = ${input.senderId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    const sender = senderRows[0] as
      | { fromName: string; fromEmail: string; replyTo: string | null; credentialId: string | null }
      | undefined;
    if (sender) {
      fromName = sender.fromName;
      fromEmail = sender.fromEmail;
      replyTo = sender.replyTo;
      credentialId = sender.credentialId;
    }
  }

  if (!fromEmail.trim()) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'From email is required.',
    });
  }

  const signatureHtml =
    input.signatureHtml !== undefined ? input.signatureHtml : existing.signatureHtml;
  const useWorkspaceSignature =
    input.useWorkspaceSignature !== undefined
      ? input.useWorkspaceSignature
      : existing.useWorkspaceSignature;
  const meetingLink =
    input.meetingLink !== undefined ? input.meetingLink?.trim() || null : existing.meetingLink;
  const portfolioLink =
    input.portfolioLink !== undefined ? input.portfolioLink?.trim() || null : existing.portfolioLink;

  if (!useWorkspaceSignature && !signatureHtml?.trim()) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'Add a signature or enable the workspace default.',
    });
  }

  const senderChanged =
    existing.fromName !== fromName ||
    existing.fromEmail !== fromEmail ||
    existing.replyTo !== replyTo ||
    existing.signatureHtml !== signatureHtml ||
    existing.useWorkspaceSignature !== useWorkspaceSignature;

  if (senderChanged) {
    await sql`
      UPDATE marketing_campaigns
      SET test_sent_at = NULL, test_sent_by = NULL, test_sent_to = NULL
      WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
    `;
  }

  await sql`
    UPDATE marketing_campaigns
    SET
      from_name = ${fromName},
      from_email = ${fromEmail},
      reply_to = ${replyTo},
      signature_html = ${signatureHtml},
      use_workspace_signature = ${useWorkspaceSignature},
      meeting_link = ${meetingLink},
      portfolio_link = ${portfolioLink},
      credential_id = ${credentialId},
      updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
  `;

  return getCampaignSender(sql, accountId, campaignId);
}

export function isTestSendValid(sender: CampaignSenderConfig): boolean {
  return Boolean(sender.testSentAt && sender.testSentTo);
}
