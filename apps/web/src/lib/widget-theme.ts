export type WidgetIconId = 'chat' | 'bubble' | 'headset' | 'message' | 'help' | 'wave';

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

export function defaultWidgetTheme(primary = '#6366F1'): WidgetTheme {
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
  primary = '#6366F1'
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
  welcomeTitle: string;
  welcomeTagline: string;
  websiteUrl: string;
  defaultAssigneeId: string;
  widgetColor: string;
  widgetIcon: WidgetIconId;
  widgetTheme: WidgetTheme;
};

export const emptyWidgetSettings = (): WidgetSettingsInput => ({
  name: '',
  channelType: 'web_widget',
  greetingMessage: 'Hi! How can we help you today?',
  welcomeTitle: 'Chat with us',
  welcomeTagline: 'We typically reply in a few minutes',
  websiteUrl: '',
  defaultAssigneeId: '',
  widgetColor: '#6366F1',
  widgetIcon: 'chat',
  widgetTheme: defaultWidgetTheme(),
});

export function settingsFromInbox(inbox: {
  name: string;
  channelType: string;
  greetingMessage?: string | null;
  welcomeTitle?: string | null;
  welcomeTagline?: string | null;
  websiteUrl?: string | null;
  defaultAssigneeId?: string | null;
  widgetColor?: string | null;
  widgetIcon?: string | null;
  widgetTheme?: Partial<WidgetTheme> | null;
}): WidgetSettingsInput {
  const primary = inbox.widgetColor ?? '#6366F1';
  return {
    name: inbox.name,
    channelType: inbox.channelType,
    greetingMessage: inbox.greetingMessage ?? 'Hi! How can we help you today?',
    welcomeTitle: inbox.welcomeTitle ?? 'Chat with us',
    welcomeTagline: inbox.welcomeTagline ?? 'We typically reply in a few minutes',
    websiteUrl: inbox.websiteUrl ?? '',
    defaultAssigneeId: inbox.defaultAssigneeId ?? '',
    widgetColor: primary,
    widgetIcon: (inbox.widgetIcon as WidgetIconId) || 'chat',
    widgetTheme: mergeWidgetTheme(inbox.widgetTheme, primary),
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
