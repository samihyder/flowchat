import { parseDomainsText, type WidgetSettingsInput } from '@/lib/widget-theme';

export function inboxPayloadFromSettings(s: WidgetSettingsInput) {
  return {
    name: s.name,
    channelType: s.channelType,
    greetingMessage: s.greetingMessage,
    welcomeTitle: s.welcomeTitle,
    welcomeTagline: s.welcomeTagline,
    websiteUrl: s.websiteUrl.trim() || undefined,
    defaultAssigneeId: s.defaultAssigneeId,
    widgetColor: s.widgetColor,
    widgetIcon: s.widgetIcon,
    widgetTheme: s.widgetTheme,
    allowedDomains: parseDomainsText(s.allowedDomainsText),
    offlineMessage: s.offlineMessage.trim() || null,
    privacyPolicyUrl: s.privacyPolicyUrl.trim() || null,
    requireConsent: s.requireConsent,
    roundRobinEnabled: s.roundRobinEnabled,
    useBusinessHours: s.useBusinessHours,
    businessHours: s.businessHours,
    missedChatMinutes: s.missedChatMinutes,
  };
}
