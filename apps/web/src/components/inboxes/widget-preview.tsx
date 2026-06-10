'use client';

import type { WidgetIconId, WidgetSettingsInput } from '@/lib/widget-theme';

const ICON_SVGS: Record<WidgetIconId, string> = {
  chat: '<path fill="currentColor" d="M8 10h8M8 14h5M20 6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2v3l4-3h6a2 2 0 0 0 2-2V6z"/>',
  bubble: '<path fill="currentColor" d="M12 3C7.03 3 3 6.58 3 11c0 2.03.9 3.87 2.36 5.24L4 21l5.2-1.62C10.5 19.8 11.23 20 12 20c4.97 0 9-3.58 9-8s-4.03-8-9-8z"/>',
  headset:
    '<path fill="currentColor" d="M12 2a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h1v-6H6a6 6 0 1 1 12 0h-2v6h1a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8zm-3 16h6v2H9v-2z"/>',
  message:
    '<path fill="currentColor" d="M4 4h16v12H8l-4 4V4zm3 3h10v2H7V7zm0 4h7v2H7v-2z"/>',
  help: '<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>',
  wave: '<path fill="currentColor" d="M7.5 12.5 10 10l2.5 2.5L17 8l1.5 1.5-5.5 5.5L10 13l-2.5 2.5L4 12l1.5-1.5 2 2z"/>',
};

type Props = { settings: WidgetSettingsInput };

export function WidgetPreview({ settings }: Props) {
  const t = settings.widgetTheme;
  const icon = ICON_SVGS[settings.widgetIcon];

  return (
    <div className="relative">
      <p className="text-xs font-medium text-gray-500 mb-2">Live preview (matches embed widget)</p>
      <div
        className="w-[320px] rounded-2xl overflow-hidden shadow-lg border"
        style={{ borderColor: t.panelBorder, background: t.panelBg }}
      >
        <div
          className="px-4 py-3 flex items-start justify-between"
          style={{ background: t.headerBg, color: t.headerTitle }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: t.headerTitle }}>
              {settings.welcomeTitle || 'Chat with us'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: t.headerSubtitle }}>
              {settings.welcomeTagline}
            </p>
          </div>
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-70"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            ✕
          </span>
        </div>
        <div className="p-4 space-y-2.5" style={{ background: t.messagesBg }}>
          <div
            className="text-sm px-3.5 py-2.5 rounded-2xl rounded-bl-sm max-w-[85%] border"
            style={{
              background: t.agentBubbleBg,
              color: t.agentBubbleText,
              borderColor: t.panelBorder,
            }}
          >
            {settings.greetingMessage}
          </div>
          <div
            className="text-sm px-3.5 py-2.5 rounded-2xl rounded-br-sm max-w-[85%] ml-auto"
            style={{
              background: t.visitorBubbleBg,
              color: t.visitorBubbleText,
            }}
          >
            Hello!
          </div>
        </div>
        <div className="p-3 flex gap-2" style={{ background: t.composerBg, borderTop: `1px solid ${t.panelBorder}` }}>
          <div
            className="flex-1 h-10 rounded-xl border text-xs flex items-center px-3"
            style={{
              background: t.inputBg,
              borderColor: t.inputBorder,
              color: t.inputPlaceholder,
            }}
          >
            Type your message…
          </div>
          <div
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center"
            style={{ background: t.buttonBg, color: t.buttonText }}
          >
            Send
          </div>
        </div>
      </div>
      <div
        className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: t.launcherBg, color: t.launcherIcon }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
    </div>
  );
}
