import type { AccountSettings } from '@/lib/account-settings';
import { applyMergeTags, type MergeContact } from '@/lib/marketing/merge-tags';

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

  const mergeExtras: Record<string, string> = {
    calendly_url: settings.marketingCalendlyUrl ?? '',
    portfolio_url: settings.marketingPortfolioUrl ?? '',
    sender_name: extras?.senderName ?? settings.marketingFromName ?? '',
    sender_email: extras?.senderEmail ?? settings.marketingFromEmail ?? '',
    company_name: extras?.companyName ?? '',
    logo_url: extras?.logoUrl ?? '',
  };

  const parts: string[] = [];
  const signature = settings.marketingEmailSignature?.trim();
  const calendly = settings.marketingCalendlyTemplate?.trim();
  const portfolio = settings.marketingPortfolioTemplate?.trim();

  if (signature) parts.push(applyMergeTags(signature, contact, mergeExtras));
  if (calendly) parts.push(applyMergeTags(calendly, contact, mergeExtras));
  if (portfolio) parts.push(applyMergeTags(portfolio, contact, mergeExtras));

  if (!parts.length) return '';
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">${parts.join('')}</div>`;
}
