export type AccountSettings = {
  allowedInviteDomains?: string[];
  dataRetentionDays?: number;
  /** Workspace default auto messages sent when a visitor starts chat (one per line in UI). */
  autoMessages?: string[];
  autoWelcomeTitle?: string;
  autoWelcomeTagline?: string;
  /** When true, LeadSnapper extension may push qualified leads via integration API. */
  leadsnapperSyncEnabled?: boolean;
  /** Minimum priority to accept: Hot, Warm, or all (default all — no restriction). */
  leadsnapperMinPriority?: 'Hot' | 'Warm' | 'all';
  /** When true, CSV import is allowed for admins + crmImportAllowedUserIds */
  crmImportEnabled?: boolean;
  /** When true, CSV export is allowed for admins + crmExportAllowedUserIds */
  crmExportEnabled?: boolean;
  crmImportAllowedUserIds?: string[];
  crmExportAllowedUserIds?: string[];
  /** Marketing email sender display name */
  marketingFromName?: string;
  /** Marketing from email (must match verified Resend domain) */
  marketingFromEmail?: string;
  marketingReplyTo?: string;
  /** CAN-SPAM physical mailing address */
  marketingPhysicalAddress?: string;
  /** When true, new contacts must confirm before marketing sends */
  marketingDoubleOptIn?: boolean;
  /** When true, marketing sends require tenant-owned ESP credentials (no platform fallback) */
  marketingByokOnly?: boolean;
  /** HTML signature block appended to marketing emails */
  marketingEmailSignature?: string;
  /** Calendly (or booking) URL used in {{calendly_url}} merge tag */
  marketingCalendlyUrl?: string;
  /** HTML template for Calendly link (supports {{calendly_url}}) */
  marketingCalendlyTemplate?: string;
  /** Portfolio URL used in {{portfolio_url}} merge tag */
  marketingPortfolioUrl?: string;
  /** HTML template for portfolio link (supports {{portfolio_url}}) */
  marketingPortfolioTemplate?: string;
  /** When true (default), append signature/calendly/portfolio to marketing emails */
  marketingAutoAppendTemplates?: boolean;
  /** Default AI credential for widget / copilot */
  aiCredentialId?: string;
  /** Preferred Anthropic model id */
  aiModel?: string;
  /** When true, chat widget uses AI to reply to visitor messages */
  widgetAiEnabled?: boolean;
};

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v): v is string => typeof v === 'string');
}

export function parseAccountSettings(raw: unknown): AccountSettings {
  if (!raw || typeof raw !== 'object') return {};
  const s = raw as Record<string, unknown>;
  return {
    allowedInviteDomains: parseStringArray(s.allowedInviteDomains),
    dataRetentionDays:
      typeof s.dataRetentionDays === 'number' ? s.dataRetentionDays : undefined,
    crmImportEnabled: typeof s.crmImportEnabled === 'boolean' ? s.crmImportEnabled : undefined,
    crmExportEnabled: typeof s.crmExportEnabled === 'boolean' ? s.crmExportEnabled : undefined,
    crmImportAllowedUserIds: parseStringArray(s.crmImportAllowedUserIds),
    crmExportAllowedUserIds: parseStringArray(s.crmExportAllowedUserIds),
    marketingFromName: typeof s.marketingFromName === 'string' ? s.marketingFromName : undefined,
    marketingFromEmail: typeof s.marketingFromEmail === 'string' ? s.marketingFromEmail : undefined,
    marketingReplyTo: typeof s.marketingReplyTo === 'string' ? s.marketingReplyTo : undefined,
    marketingPhysicalAddress:
      typeof s.marketingPhysicalAddress === 'string' ? s.marketingPhysicalAddress : undefined,
    marketingDoubleOptIn:
      typeof s.marketingDoubleOptIn === 'boolean' ? s.marketingDoubleOptIn : undefined,
    marketingByokOnly: typeof s.marketingByokOnly === 'boolean' ? s.marketingByokOnly : undefined,
    marketingEmailSignature:
      typeof s.marketingEmailSignature === 'string' ? s.marketingEmailSignature : undefined,
    marketingCalendlyUrl: typeof s.marketingCalendlyUrl === 'string' ? s.marketingCalendlyUrl : undefined,
    marketingCalendlyTemplate:
      typeof s.marketingCalendlyTemplate === 'string' ? s.marketingCalendlyTemplate : undefined,
    marketingPortfolioUrl:
      typeof s.marketingPortfolioUrl === 'string' ? s.marketingPortfolioUrl : undefined,
    marketingPortfolioTemplate:
      typeof s.marketingPortfolioTemplate === 'string' ? s.marketingPortfolioTemplate : undefined,
    marketingAutoAppendTemplates:
      typeof s.marketingAutoAppendTemplates === 'boolean' ? s.marketingAutoAppendTemplates : undefined,
    aiCredentialId: typeof s.aiCredentialId === 'string' ? s.aiCredentialId : undefined,
    aiModel: typeof s.aiModel === 'string' ? s.aiModel : undefined,
    widgetAiEnabled: typeof s.widgetAiEnabled === 'boolean' ? s.widgetAiEnabled : undefined,
    autoMessages: parseStringArray(s.autoMessages),
    autoWelcomeTitle: typeof s.autoWelcomeTitle === 'string' ? s.autoWelcomeTitle : undefined,
    autoWelcomeTagline: typeof s.autoWelcomeTagline === 'string' ? s.autoWelcomeTagline : undefined,
    leadsnapperSyncEnabled:
      typeof s.leadsnapperSyncEnabled === 'boolean' ? s.leadsnapperSyncEnabled : undefined,
    leadsnapperMinPriority:
      s.leadsnapperMinPriority === 'Hot' || s.leadsnapperMinPriority === 'Warm' || s.leadsnapperMinPriority === 'all'
        ? s.leadsnapperMinPriority
        : undefined,
  };
}

export function mergeAccountSettings(
  current: unknown,
  patch: AccountSettings
): AccountSettings {
  return { ...parseAccountSettings(current), ...patch };
}
