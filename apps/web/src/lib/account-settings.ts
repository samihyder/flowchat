export type AccountSettings = {
  allowedInviteDomains?: string[];
  dataRetentionDays?: number;
};

export function parseAccountSettings(raw: unknown): AccountSettings {
  if (!raw || typeof raw !== 'object') return {};
  const s = raw as Record<string, unknown>;
  return {
    allowedInviteDomains: Array.isArray(s.allowedInviteDomains)
      ? (s.allowedInviteDomains as string[])
      : undefined,
    dataRetentionDays:
      typeof s.dataRetentionDays === 'number' ? s.dataRetentionDays : undefined,
  };
}

export function mergeAccountSettings(
  current: unknown,
  patch: AccountSettings
): AccountSettings {
  return { ...parseAccountSettings(current), ...patch };
}
