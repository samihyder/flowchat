import type { AccountSettings } from '@/lib/account-settings';
import { applyMergeTags, buildSendMergeExtras, type MergeContact } from '@/lib/marketing/merge-tags';
import type { MarketingAppendixExtras } from '@/lib/marketing/email-appendix';
import { resolveDefaultSignatureHtml } from '@/lib/marketing/signatures';

export type CampaignAppendixInput = {
  signatureHtml: string | null;
  useWorkspaceSignature: boolean;
  meetingLink: string | null;
  portfolioLink: string | null;
};

/** Campaign-specific signature + link blocks appended at send (S6M-21–22). */
export function buildCampaignEmailAppendix(
  settings: AccountSettings,
  contact: MergeContact,
  campaign: CampaignAppendixInput,
  extras?: MarketingAppendixExtras
): string {
  const mergeExtras = buildSendMergeExtras({
    meetingLink: campaign.meetingLink ?? settings.marketingCalendlyUrl,
    portfolioLink: campaign.portfolioLink ?? settings.marketingPortfolioUrl,
    senderName: extras?.senderName ?? settings.marketingFromName,
    senderEmail: extras?.senderEmail ?? settings.marketingFromEmail,
    companyName: extras?.companyName,
    logoUrl: extras?.logoUrl,
  });

  const parts: string[] = [];

  if (campaign.useWorkspaceSignature) {
    const signature = resolveDefaultSignatureHtml(settings).trim();
    if (signature) parts.push(applyMergeTags(signature, contact, mergeExtras));
  } else if (campaign.signatureHtml?.trim()) {
    parts.push(applyMergeTags(campaign.signatureHtml.trim(), contact, mergeExtras));
  }

  const meeting = mergeExtras.meeting_link?.trim();
  const portfolio = mergeExtras.portfolio_link?.trim();
  if (meeting && !parts.some((p) => p.includes(meeting))) {
    parts.push(
      `<p style="margin-top:12px"><a href="${meeting}" style="color:#06B6D4">Schedule a meeting</a></p>`
    );
  }
  if (portfolio && !parts.some((p) => p.includes(portfolio))) {
    parts.push(
      `<p style="margin-top:8px"><a href="${portfolio}" style="color:#06B6D4">View our portfolio</a></p>`
    );
  }

  if (!parts.length) return '';
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">${parts.join('')}</div>`;
}
