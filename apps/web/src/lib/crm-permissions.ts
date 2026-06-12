import type { AccountSettings } from '@/lib/account-settings';

export function canImportContacts(
  settings: AccountSettings,
  userId: string,
  role: string
): boolean {
  if (!settings.crmImportEnabled) return false;
  if (role === 'administrator') return true;
  return (settings.crmImportAllowedUserIds ?? []).includes(userId);
}

export function canExportContacts(
  settings: AccountSettings,
  userId: string,
  role: string
): boolean {
  if (!settings.crmExportEnabled) return false;
  if (role === 'administrator') return true;
  return (settings.crmExportAllowedUserIds ?? []).includes(userId);
}
