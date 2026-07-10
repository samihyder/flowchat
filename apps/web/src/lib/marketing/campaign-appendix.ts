import type { AccountSettings } from '@/lib/account-settings';
import { applyMergeTags, type MergeContact } from '@/lib/marketing/merge-tags';
import type { MarketingAppendixExtras } from '@/lib/marketing/email-appendix';

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
  const mergeExtras: Record<string, string> = {
    meeting_link: campaign.meetingLink ?? settings.marketingCalendlyUrl ?? '',
    portfolio_link: campaign.portfolioLink ?? settings.marketingPortfolioUrl ?? '',
    calendly_url: campaign.meetingLink ?? settings.marketingCalendlyUrl ?? '',
    portfolio_url: campaign.portfolioLink ?? settings.marketingPortfolioUrl ?? '',
    sender_name: extras?.senderName ?? settings.marketingFromName ?? '',
    sender_email: extras?.senderEmail ?? settings.marketingFromEmail ?? '',
    company_name: extras?.companyName ?? '',
    logo_url: extras?.logoUrl ?? '',
  };

  const parts: string[] = [];

  if (campaign.useWorkspaceSignature) {
    const signature = settings.marketingEmailSignature?.trim();
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
