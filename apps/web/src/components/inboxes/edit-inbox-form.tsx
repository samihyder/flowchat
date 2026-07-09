'use client';

import { useState } from 'react';
import { api, type AnalyticsException } from '@/lib/api';
import { ensureWorkspace } from '@/lib/workspace';
import { WidgetCustomizer } from '@/components/inboxes/widget-customizer';
import {
  InboxAgentFields,
  InboxSecurityFields,
  InboxGdprFields,
  InboxBusinessHoursFields,
  InboxAnalyticsFields,
  InboxPreChatFields,
} from '@/components/inboxes/inbox-form-fields';
import { AnalyticsExceptionsPanel } from '@/components/analytics/analytics-exceptions-panel';
import { inboxPayloadFromSettings } from '@/components/inboxes/inbox-payload';
import { settingsFromInbox, type WidgetSettingsInput } from '@/lib/widget-theme';
import type { Inbox } from '@/lib/api';

type AgentOption = { userId: string; name: string; email: string };

type Props = {
  inbox: Inbox;
  agents: AgentOption[];
  token: string;
  accountId: string | null;
  onSaved: () => void;
  onCancel: () => void;
};

const TABS = [
  'General',
  'Business Hours',
  'Security',
  'GDPR',
  'Pre-chat Form',
  'Auto Triggers',
  'Analytics',
] as const;
type Tab = (typeof TABS)[number];

/** Isolated edit form so typing does not re-render sibling inbox rows. */
export function EditInboxForm({ inbox, agents, token, accountId, onSaved, onCancel }: Props) {
  const [settings, setSettings] = useState<WidgetSettingsInput>(() => settingsFromInbox(inbox));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('General');
  const [exceptions, setExceptions] = useState<AnalyticsException[]>([]);
  const [exceptionsLoaded, setExceptionsLoaded] = useState(false);

  const loadExceptions = async () => {
    if (!token || !accountId) return;
    const res = await api.inboxes.analytics(accountId, inbox.id, token);
    setExceptions(res.exceptions ?? []);
    setExceptionsLoaded(true);
  };

  const selectTab = (t: Tab) => {
    setTab(t);
    if (t === 'Analytics' && !exceptionsLoaded) void loadExceptions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resolvedAccountId = accountId || (await ensureWorkspace());
    if (!resolvedAccountId) return;
    if (!settings.defaultAssigneeId) {
      setError('Please select a default agent for this website.');
      setTab('General');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.inboxes.update(resolvedAccountId, inbox.id, inboxPayloadFromSettings(settings), token);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update inbox');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Edit widget</h4>

      <div className="flex flex-wrap gap-1 border-b border-gray-100 mb-4 -mx-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4 min-h-[120px]">
        {tab === 'General' && (
          <>
            <InboxAgentFields settings={settings} agents={agents} onChange={setSettings} />
            <WidgetCustomizer settings={settings} onChange={setSettings} showNameChannel={false} />
          </>
        )}
        {tab === 'Business Hours' && <InboxBusinessHoursFields settings={settings} onChange={setSettings} />}
        {tab === 'Security' && <InboxSecurityFields settings={settings} onChange={setSettings} />}
        {tab === 'GDPR' && <InboxGdprFields settings={settings} onChange={setSettings} />}
        {tab === 'Pre-chat Form' && <InboxPreChatFields settings={settings} onChange={setSettings} />}
        {tab === 'Auto Triggers' && (
          <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/60">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-gray-900">Auto triggers</h5>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Event-based automation (e.g. visitor idle N seconds → proactive message, page URL match → greeting
              override) isn&apos;t built yet. A similar trigger concept was deliberately retired elsewhere in this
              app in favor of campaign-based marketing — reviving or replacing it for inbox widgets is a product
              decision, not wired up here.
            </p>
          </div>
        )}
        {tab === 'Analytics' && (
          <>
            <InboxAnalyticsFields settings={settings} onChange={setSettings} />
            {accountId && (
              <AnalyticsExceptionsPanel
                accountId={accountId}
                inboxId={inbox.id}
                token={token}
                isAdmin
                exceptions={exceptions}
                onChange={() => void loadExceptions()}
              />
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
