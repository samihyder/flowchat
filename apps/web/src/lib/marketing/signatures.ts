import type { AccountSettings, MarketingEmailSignature } from '@/lib/account-settings';
import { ACCOUNT_LOGO_SIZE_PX } from '@/lib/branding/logo';

export const DEFAULT_SIGNATURE_HTML = `<p>Best regards,</p>
<p><img src="{{logo_url}}" alt="{{company_name}}" width="${ACCOUNT_LOGO_SIZE_PX}" height="${ACCOUNT_LOGO_SIZE_PX}" style="border-radius:8px;max-width:100%;height:auto" /></p>
<p><strong>{{sender_name}}</strong><br/>{{company_name}}<br/><a href="mailto:{{sender_email}}">{{sender_email}}</a></p>`;

/**
 * The signature a send should use: the one flagged isDefault among the workspace's saved
 * signatures, falling back to the first if none is flagged, then to the pre-migration
 * single-signature field for accounts that haven't touched this since (see
 * AccountSettings.marketingEmailSignature), then null.
 */
export function resolveDefaultSignature(settings: AccountSettings): MarketingEmailSignature | null {
  const list = settings.marketingEmailSignatures ?? [];
  if (list.length > 0) {
    return list.find((s) => s.isDefault) ?? list[0] ?? null;
  }
  if (settings.marketingEmailSignature?.trim()) {
    return {
      id: 'legacy',
      name: 'Default',
      html: settings.marketingEmailSignature,
      isDefault: true,
    };
  }
  return null;
}

export function resolveDefaultSignatureHtml(settings: AccountSettings): string {
  return resolveDefaultSignature(settings)?.html ?? DEFAULT_SIGNATURE_HTML;
}
