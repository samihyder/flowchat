import type { AccountSettings } from '@/lib/account-settings';

export function canImportContacts(
  settings: AccountSettings,
  userId: string,
  role: string
): boolean {
  if (settings.crmImportEnabled === false) return false;
  if (role === 'administrator') return true;
  if (settings.crmImportEnabled !== true) return false;
  return (settings.crmImportAllowedUserIds ?? []).includes(userId);
}

export function canExportContacts(
  settings: AccountSettings,
  userId: string,
  role: string
): boolean {
  if (settings.crmExportEnabled === false) return false;
  if (role === 'administrator') return true;
  if (settings.crmExportEnabled !== true) return false;
  return (settings.crmExportAllowedUserIds ?? []).includes(userId);
}
