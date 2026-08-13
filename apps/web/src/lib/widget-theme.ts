import type { BusinessHours } from '@/lib/business-hours';
import type { PreChatField } from '@/lib/api';
import { DEFAULT_BUSINESS_HOURS } from '@/lib/business-hours';
import {
  DEFAULT_GREETING_MESSAGES,
  DEFAULT_WELCOME_TAGLINE,
  DEFAULT_WELCOME_TITLE,
} from '@/lib/welcome-message-defaults';
import { MUTEX_PRIMARY_DEFAULT } from '@/lib/mutex-brand';

export type WidgetIconId = 'chat' | 'bubble' | 'headset' | 'message' | 'help' | 'wave';

/** hosted = FlowChat launcher UI; headless = API/WS only for a custom UI */
export type WidgetMode = 'hosted' | 'headless';

export type WidgetTheme = {
  launcherBg: string;
  launcherIcon: string;
  headerBg: string;
  headerTitle: string;
  headerSubtitle: string;
  panelBg: string;
  panelBorder: string;
  messagesBg: string;
  agentBubbleBg: string;
  agentBubbleText: string;
  visitorBubbleBg: string;
  visitorBubbleText: string;
  systemText: string;
  labelText: string;
  inputBg: string;
  inputText: string;
  inputBorder: string;
  inputPlaceholder: string;
  composerBg: string;
  buttonBg: string;
  buttonText: string;
};

export const WIDGET_ICONS: { id: WidgetIconId; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'bubble', label: 'Bubble' },
  { id: 'headset', label: 'Support' },
  { id: 'message', label: 'Message' },
  { id: 'help', label: 'Help' },
  { id: 'wave', label: 'Wave' },
];

export const THEME_FIELDS: { key: keyof WidgetTheme; label: string; group: string }[] = [
  { key: 'launcherBg', label: 'Launcher background', group: 'Launcher' },
  { key: 'launcherIcon', label: 'Launcher icon', group: 'Launcher' },
  { key: 'headerBg', label: 'Header background', group: 'Header' },
  { key: 'headerTitle', label: 'Header title', group: 'Header' },
  { key: 'headerSubtitle', label: 'Header subtitle', group: 'Header' },
  { key: 'panelBg', label: 'Panel background', group: 'Panel' },
  { key: 'panelBorder', label: 'Panel border', group: 'Panel' },
  { key: 'messagesBg', label: 'Messages area', group: 'Messages' },
  { key: 'agentBubbleBg', label: 'Agent bubble background', group: 'Messages' },
  { key: 'agentBubbleText', label: 'Agent bubble text', group: 'Messages' },
  { key: 'visitorBubbleBg', label: 'Visitor bubble background', group: 'Messages' },
  { key: 'visitorBubbleText', label: 'Visitor bubble text', group: 'Messages' },
  { key: 'systemText', label: 'System message text', group: 'Messages' },
  { key: 'labelText', label: 'Form labels', group: 'Form' },
  { key: 'inputBg', label: 'Input background', group: 'Form' },
  { key: 'inputText', label: 'Input text', group: 'Form' },
  { key: 'inputBorder', label: 'Input border', group: 'Form' },
  { key: 'inputPlaceholder', label: 'Placeholder text', group: 'Form' },
  { key: 'composerBg', label: 'Composer area', group: 'Composer' },
  { key: 'buttonBg', label: 'Button background', group: 'Buttons' },
  { key: 'buttonText', label: 'Button text', group: 'Buttons' },
];

export function defaultWidgetTheme(primary: string = MUTEX_PRIMARY_DEFAULT): WidgetTheme {
  return {
    launcherBg: primary,
    launcherIcon: '#ffffff',
    headerBg: primary,
    headerTitle: '#ffffff',
    headerSubtitle: '#ffffff',
    panelBg: '#ffffff',
    panelBorder: '#e5e7eb',
    messagesBg: '#f9fafb',
    agentBubbleBg: '#ffffff',
    agentBubbleText: '#111827',
    visitorBubbleBg: primary,
    visitorBubbleText: '#ffffff',
    systemText: '#6b7280',
    labelText: '#374151',
    inputBg: '#ffffff',
    inputText: '#111827',
    inputBorder: '#d1d5db',
    inputPlaceholder: '#9ca3af',
    composerBg: '#ffffff',
    buttonBg: primary,
    buttonText: '#ffffff',
  };
}

export function mergeWidgetTheme(
  partial?: Partial<WidgetTheme> | string | null,
  primary: string = MUTEX_PRIMARY_DEFAULT
): WidgetTheme {
  let theme: Partial<WidgetTheme> = {};
  if (typeof partial === 'string') {
    try {
      theme = JSON.parse(partial) as Partial<WidgetTheme>;
    } catch {
      theme = {};
    }
  } else if (partial) {
    theme = partial;
  }
  return { ...defaultWidgetTheme(primary), ...theme };
}

export type WidgetSettingsInput = {
  name: string;
  channelType: string;
  greetingMessage: string;
  greetingMessages: string[];
  welcomeTitle: string;
  welcomeTagline: string;
  websiteUrl: string;
  defaultAssigneeId: string;
  widgetColor: string;
  widgetIcon: WidgetIconId;
  widgetMode: WidgetMode;
  widgetTheme: WidgetTheme;
  allowedDomainsText: string;
  offlineMessage: string;
  privacyPolicyUrl: string;
  requireConsent: boolean;
  roundRobinEnabled: boolean;
  useBusinessHours: boolean;
  businessHours: BusinessHours;
  missedChatMinutes: number;
  csatEnabled: boolean;
  preChatFields: PreChatField[];
};

export const emptyWidgetSettings = (): WidgetSettingsInput => ({
  name: '',
  channelType: 'web_widget',
  greetingMessage: DEFAULT_GREETING_MESSAGES.join('\n'),
  greetingMessages: [...DEFAULT_GREETING_MESSAGES],
  welcomeTitle: DEFAULT_WELCOME_TITLE,
  welcomeTagline: DEFAULT_WELCOME_TAGLINE,
  websiteUrl: '',
  defaultAssigneeId: '',
  widgetColor: MUTEX_PRIMARY_DEFAULT,
  widgetIcon: 'chat',
  widgetMode: 'hosted',
  widgetTheme: defaultWidgetTheme(),
  allowedDomainsText: '',
  offlineMessage: 'We are currently offline. Leave a message and we will get back to you soon.',
  privacyPolicyUrl: '',
  requireConsent: false,
  roundRobinEnabled: false,
  useBusinessHours: false,
  businessHours: DEFAULT_BUSINESS_HOURS,
  missedChatMinutes: 5,
  csatEnabled: false,
  preChatFields: [],
});

export function parseDomainsText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter(Boolean);
}

/** Neon/jsonb may return an array, a JSON string, or null — always normalize to string[]. */
export function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      return trimmed
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizePreChatFields(value: unknown): PreChatField[] {
  if (!Array.isArray(value)) return [];
  return value.filter((f): f is PreChatField => !!f && typeof f === 'object');
}

export function settingsFromInbox(inbox: {
  name: string;
  channelType: string;
  greetingMessage?: string | null;
  greetingMessages?: string[] | null | unknown;
  welcomeTitle?: string | null;
  welcomeTagline?: string | null;
  websiteUrl?: string | null;
  defaultAssigneeId?: string | null;
  widgetColor?: string | null;
  widgetIcon?: string | null;
  widgetMode?: WidgetMode | string | null;
  widgetTheme?: Partial<WidgetTheme> | null;
  allowedDomains?: string[] | null | unknown;
  offlineMessage?: string | null;
  privacyPolicyUrl?: string | null;
  requireConsent?: boolean;
  roundRobinEnabled?: boolean;
  useBusinessHours?: boolean;
  businessHours?: BusinessHours | Record<string, unknown> | null;
  missedChatMinutes?: number;
  csatEnabled?: boolean;
  preChatFields?: PreChatField[] | null | unknown;
}): WidgetSettingsInput {
  const primary = inbox.widgetColor ?? MUTEX_PRIMARY_DEFAULT;
  const fromJsonb = normalizeStringList(inbox.greetingMessages);
  const greetingMessages =
    fromJsonb.length > 0
      ? fromJsonb
      : inbox.greetingMessage
        ? inbox.greetingMessage
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        : [...DEFAULT_GREETING_MESSAGES];

  return {
    name: inbox.name,
    channelType: inbox.channelType,
    greetingMessage: greetingMessages.join('\n'),
    greetingMessages,
    welcomeTitle: inbox.welcomeTitle ?? (inbox.name ? `Chat with ${inbox.name}` : DEFAULT_WELCOME_TITLE),
    welcomeTagline: inbox.welcomeTagline ?? DEFAULT_WELCOME_TAGLINE,
    websiteUrl: inbox.websiteUrl ?? '',
    defaultAssigneeId: inbox.defaultAssigneeId ?? '',
    widgetColor: primary,
    widgetIcon: (inbox.widgetIcon as WidgetIconId) || 'chat',
    widgetMode: inbox.widgetMode === 'headless' ? 'headless' : 'hosted',
    widgetTheme: mergeWidgetTheme(inbox.widgetTheme, primary),
    allowedDomainsText: normalizeStringList(inbox.allowedDomains).join('\n'),
    offlineMessage:
      inbox.offlineMessage ??
      'We are currently offline. Leave a message and we will get back to you soon.',
    privacyPolicyUrl: inbox.privacyPolicyUrl ?? '',
    requireConsent: inbox.requireConsent ?? false,
    roundRobinEnabled: inbox.roundRobinEnabled ?? false,
    useBusinessHours: inbox.useBusinessHours ?? false,
    businessHours: { ...DEFAULT_BUSINESS_HOURS, ...(inbox.businessHours as BusinessHours | undefined) },
    missedChatMinutes: inbox.missedChatMinutes ?? 5,
    csatEnabled: inbox.csatEnabled ?? false,
    preChatFields: normalizePreChatFields(inbox.preChatFields),
  };
}

export function themeFromPrimary(color: string, current?: WidgetTheme): WidgetTheme {
  const base = defaultWidgetTheme(color);
  if (!current) return base;
  return {
    ...current,
    launcherBg: color,
    headerBg: color,
    visitorBubbleBg: color,
    buttonBg: color,
  };
}
