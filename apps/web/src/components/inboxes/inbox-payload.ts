import { parseDomainsText, type WidgetSettingsInput } from '@/lib/widget-theme';

export function inboxPayloadFromSettings(s: WidgetSettingsInput) {
  const greetingMessages = Array.isArray(s.greetingMessages)
    ? s.greetingMessages.filter((m) => typeof m === 'string' && m.trim())
    : [];
  const resolved =
    greetingMessages.length > 0
      ? greetingMessages
      : s.greetingMessage
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

  return {
    name: s.name,
    channelType: s.channelType,
    greetingMessage: resolved.join('\n'),
    greetingMessages: resolved,
    welcomeTitle: s.welcomeTitle,
    welcomeTagline: s.welcomeTagline,
    websiteUrl: s.websiteUrl.trim() || undefined,
    defaultAssigneeId: s.defaultAssigneeId,
    widgetColor: s.widgetColor,
    widgetIcon: s.widgetIcon,
    widgetMode: s.widgetMode,
    autoOpenChat: s.autoOpenChat,
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
    preChatFields: Array.isArray(s.preChatFields) ? s.preChatFields : [],
  };
}
