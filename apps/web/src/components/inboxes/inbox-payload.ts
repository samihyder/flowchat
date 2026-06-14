import { parseDomainsText, type WidgetSettingsInput } from '@/lib/widget-theme';

export function inboxPayloadFromSettings(s: WidgetSettingsInput) {
  const greetingMessages =
    s.greetingMessages.length > 0
      ? s.greetingMessages
      : s.greetingMessage
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

  return {
    name: s.name,
    channelType: s.channelType,
    greetingMessage: greetingMessages.join('\n'),
    greetingMessages,
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
    csatEnabled: s.csatEnabled,
    preChatFields: s.preChatFields,
  };
}
