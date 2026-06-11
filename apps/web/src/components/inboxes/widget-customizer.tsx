'use client';

import {
  THEME_FIELDS,
  WIDGET_ICONS,
  type WidgetIconId,
  type WidgetSettingsInput,
  type WidgetTheme,
} from '@/lib/widget-theme';
import { WidgetPreview } from '@/components/inboxes/widget-preview';
import { Input } from '@/components/ui/input';
import { labelClass, selectClass } from '@/components/ui/form-field';

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

type Props = {
  settings: WidgetSettingsInput;
  onChange: (settings: WidgetSettingsInput) => void;
  showNameChannel?: boolean;
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 rounded-lg border border-gray-200 cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 py-1.5 text-xs font-mono"
        />
      </div>
    </div>
  );
}

export function WidgetCustomizer({ settings, onChange, showNameChannel = true }: Props) {
  const updateTheme = (key: keyof WidgetTheme, value: string) => {
    onChange({
      ...settings,
      widgetTheme: { ...settings.widgetTheme, [key]: value },
    });
  };

  const groups = [...new Set(THEME_FIELDS.map((f) => f.group))];

  return (
    <div className="space-y-5">
      {showNameChannel && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <Input
              value={settings.name}
              onChange={(e) => onChange({ ...settings, name: e.target.value })}
              placeholder="Website Support"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Channel</label>
            <select
              value={settings.channelType}
              onChange={(e) => onChange({ ...settings, channelType: e.target.value })}
              className={selectClass}
            >
              <option value="web_widget">Website Live Chat</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Greeting message</label>
        <Input
          value={settings.greetingMessage}
          onChange={(e) => onChange({ ...settings, greetingMessage: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Header title</label>
          <Input
            value={settings.welcomeTitle}
            onChange={(e) => onChange({ ...settings, welcomeTitle: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Header subtitle</label>
          <Input
            value={settings.welcomeTagline}
            onChange={(e) => onChange({ ...settings, welcomeTagline: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Chat icon</label>
        <div className="flex flex-wrap gap-2">
          {WIDGET_ICONS.map((icon) => (
            <button
              key={icon.id}
              type="button"
              onClick={() => onChange({ ...settings, widgetIcon: icon.id })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                settings.widgetIcon === icon.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: settings.widgetTheme.launcherBg, color: settings.widgetTheme.launcherIcon }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" dangerouslySetInnerHTML={{ __html: ICON_SVGS[icon.id] }} />
              </span>
              <span className="text-xs text-gray-600">{icon.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Primary color (quick apply)</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.widgetColor}
            onChange={(e) => {
              const color = e.target.value;
              onChange({
                ...settings,
                widgetColor: color,
                widgetTheme: {
                  ...settings.widgetTheme,
                  launcherBg: color,
                  headerBg: color,
                  visitorBubbleBg: color,
                  buttonBg: color,
                },
              });
            }}
            className="size-10 rounded-lg border border-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/25"
          />
          <span className="text-sm text-gray-500 font-mono">{settings.widgetColor}</span>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50/50">
        <h4 className="text-sm font-semibold text-gray-900">Widget colors</h4>
        {groups.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group}</p>
            <div className="grid grid-cols-2 gap-3">
              {THEME_FIELDS.filter((f) => f.group === group).map((field) => (
                <ColorField
                  key={field.key}
                  label={field.label}
                  value={settings.widgetTheme[field.key]}
                  onChange={(v) => updateTheme(field.key, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <WidgetPreview settings={settings} />
    </div>
  );
}
