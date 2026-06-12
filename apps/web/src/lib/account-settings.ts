export type AccountSettings = {
  allowedInviteDomains?: string[];
  dataRetentionDays?: number;
  /** When true, CSV import is allowed for admins + crmImportAllowedUserIds */
  crmImportEnabled?: boolean;
  /** When true, CSV export is allowed for admins + crmExportAllowedUserIds */
  crmExportEnabled?: boolean;
  crmImportAllowedUserIds?: string[];
  crmExportAllowedUserIds?: string[];
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
  };
}

export function mergeAccountSettings(
  current: unknown,
  patch: AccountSettings
): AccountSettings {
  return { ...parseAccountSettings(current), ...patch };
}
