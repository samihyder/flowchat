'use client';

import { BusinessHoursEditor } from '@/components/inboxes/business-hours-editor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { checkboxClass, labelClass, selectClass } from '@/components/ui/form-field';
import type { WidgetSettingsInput } from '@/lib/widget-theme';

type AgentOption = { userId: string; name: string; email: string };

export function InboxAgentFields({
  settings,
  agents,
  onChange,
}: {
  settings: WidgetSettingsInput;
  agents: AgentOption[];
  onChange: (s: WidgetSettingsInput) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>
          Website URL <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <Input
          type="url"
          value={settings.websiteUrl}
          onChange={(e) => onChange({ ...settings, websiteUrl: e.target.value })}
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className={labelClass}>
          Default agent <span className="text-red-500">*</span>
        </label>
        <select
          value={settings.defaultAssigneeId}
          onChange={(e) => onChange({ ...settings, defaultAssigneeId: e.target.value })}
          required
          className={selectClass}
        >
          <option value="">Select an agent…</option>
          {agents.map((agent) => (
            <option key={agent.userId} value={agent.userId}>
              {agent.name} ({agent.email})
            </option>
          ))}
        </select>
        {agents.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">Invite agents in Settings → Agents first.</p>
        )}
      </div>
    </div>
  );
}

export function InboxTrustFields({
  settings,
  onChange,
}: {
  settings: WidgetSettingsInput;
  onChange: (s: WidgetSettingsInput) => void;
}) {
  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <h4 className="text-sm font-semibold text-gray-900">Security & availability</h4>
      <div>
        <label className={labelClass}>
          Allowed domains <span className="font-normal text-gray-400">(one per line, empty = allow all)</span>
        </label>
        <Textarea
          value={settings.allowedDomainsText}
          onChange={(e) => onChange({ ...settings, allowedDomainsText: e.target.value })}
          rows={3}
          placeholder={'example.com\nwww.example.com'}
          className="font-mono"
        />
      </div>
      <div>
        <label className={labelClass}>Offline message</label>
        <Textarea
          value={settings.offlineMessage}
          onChange={(e) => onChange({ ...settings, offlineMessage: e.target.value })}
          rows={2}
        />
      </div>
      <div>
        <label className={labelClass}>Privacy policy URL</label>
        <Input
          type="url"
          value={settings.privacyPolicyUrl}
          onChange={(e) => onChange({ ...settings, privacyPolicyUrl: e.target.value })}
          placeholder="https://example.com/privacy"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
        <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={settings.requireConsent}
            onChange={(e) => onChange({ ...settings, requireConsent: e.target.checked })}
          />
          Require pre-chat consent
        </label>
        <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={settings.roundRobinEnabled}
            onChange={(e) => onChange({ ...settings, roundRobinEnabled: e.target.checked })}
          />
          Round-robin assignment
        </label>
      </div>
      <BusinessHoursEditor
        enabled={settings.useBusinessHours}
        hours={settings.businessHours}
        onEnabledChange={(useBusinessHours) => onChange({ ...settings, useBusinessHours })}
        onChange={(businessHours) => onChange({ ...settings, businessHours })}
      />
      <div className="max-w-xs">
        <label className={labelClass}>Missed-chat alert threshold (minutes)</label>
        <Input
          type="number"
          min={1}
          max={120}
          value={settings.missedChatMinutes}
          onChange={(e) =>
            onChange({ ...settings, missedChatMinutes: Math.max(1, Number(e.target.value) || 5) })
          }
        />
        <p className="mt-1 text-xs text-gray-400">Agents are alerted if no reply within this window.</p>
      </div>
    </div>
  );
}
