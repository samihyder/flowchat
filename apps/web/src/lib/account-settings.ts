export type AccountSettings = {
  allowedInviteDomains?: string[];
  dataRetentionDays?: number;
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
  };
}

export function mergeAccountSettings(
  current: unknown,
  patch: AccountSettings
): AccountSettings {
  return { ...parseAccountSettings(current), ...patch };
}
