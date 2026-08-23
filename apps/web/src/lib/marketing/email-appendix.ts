import type { AccountSettings } from '@/lib/account-settings';
import { applyMergeTags, buildSendMergeExtras, type MergeContact } from '@/lib/marketing/merge-tags';
import { resolveDefaultSignatureHtml } from '@/lib/marketing/signatures';

export type MarketingAppendixExtras = {
  senderName?: string;
  senderEmail?: string;
  companyName?: string;
  logoUrl?: string;
};

/** HTML blocks appended to outbound marketing emails (signature, Calendly, portfolio). */
export function buildMarketingEmailAppendix(
  settings: AccountSettings,
  contact: MergeContact,
  extras?: MarketingAppendixExtras
): string {
  if (settings.marketingAutoAppendTemplates === false) return '';

  const mergeExtras = buildSendMergeExtras({
    meetingLink: settings.marketingCalendlyUrl,
    portfolioLink: settings.marketingPortfolioUrl,
    senderName: extras?.senderName ?? settings.marketingFromName,
    senderEmail: extras?.senderEmail ?? settings.marketingFromEmail,
    companyName: extras?.companyName,
    logoUrl: extras?.logoUrl,
  });

  const parts: string[] = [];
  const signature = resolveDefaultSignatureHtml(settings).trim();
  const calendly = settings.marketingCalendlyTemplate?.trim();
  const portfolio = settings.marketingPortfolioTemplate?.trim();

  if (signature) parts.push(applyMergeTags(signature, contact, mergeExtras));
  if (calendly) parts.push(applyMergeTags(calendly, contact, mergeExtras));
  if (portfolio) parts.push(applyMergeTags(portfolio, contact, mergeExtras));

  if (!parts.length) return '';
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">${parts.join('')}</div>`;
}
