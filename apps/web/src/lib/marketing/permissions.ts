/** S6M marketing RBAC — see marketing-module-screens.md §8 */

export type AccountRole = 'administrator' | 'agent' | string;

export function isAdministrator(role: AccountRole): boolean {
  return role === 'administrator';
}

export function canLaunchCampaign(role: AccountRole): boolean {
  return isAdministrator(role);
}

export function canControlCampaign(role: AccountRole): boolean {
  return isAdministrator(role);
}

export function canExportCampaignCsv(role: AccountRole): boolean {
  return isAdministrator(role);
}

export function canEditCampaignDraft(_role: AccountRole): boolean {
  return true;
}

export function canSendTestEmail(_role: AccountRole): boolean {
  return true;
}
