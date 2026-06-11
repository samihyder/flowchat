'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Inbox } from '@/lib/api';
import { PRODUCTION_WS_URL } from '@/lib/config';
import { ensureWorkspace } from '@/lib/workspace';
import { WidgetCustomizer } from '@/components/inboxes/widget-customizer';
import { BusinessHoursEditor } from '@/components/inboxes/business-hours-editor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { checkboxClass, labelClass, selectClass } from '@/components/ui/form-field';
import {
  emptyWidgetSettings,
  parseDomainsText,
  settingsFromInbox,
  type WidgetSettingsInput,
} from '@/lib/widget-theme';

const channelIcon: Record<string, string> = {
  web_widget: '💬',
  email: '✉️',
  whatsapp: '📱',
  api: '🔌',
};

type AgentOption = { userId: string; name: string; email: string };

export default function InboxesPage() {
  const { token, accountId } = useAuthStore();
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createSettings, setCreateSettings] = useState<WidgetSettingsInput>(emptyWidgetSettings());
  const [editSettings, setEditSettings] = useState<WidgetSettingsInput>(emptyWidgetSettings());

  const fetchInboxes = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const resolvedAccountId = accountId || (await ensureWorkspace());
      if (!resolvedAccountId) {
        setError('Workspace not loaded. Sign out and sign back in.');
        return;
      }
      const [inboxRes, agentRes] = await Promise.all([
        api.inboxes.list(resolvedAccountId, token),
        api.agents.list(resolvedAccountId, token),
      ]);
      setInboxes(inboxRes.inboxes);
      setAgents(
        agentRes.agents
          .filter((a) => a.isActive)
          .map((a) => ({ userId: a.userId, name: a.displayName || a.name, email: a.email }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inboxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, [token, accountId]);

  const inboxPayload = (s: WidgetSettingsInput) => ({
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
  });

  const TrustFields = ({
    settings,
    onChange,
  }: {
    settings: WidgetSettingsInput;
    onChange: (s: WidgetSettingsInput) => void;
  }) => (
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

  const AgentFields = ({
    settings,
    onChange,
  }: {
    settings: WidgetSettingsInput;
    onChange: (s: WidgetSettingsInput) => void;
  }) => (
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resolvedAccountId = accountId || (await ensureWorkspace());
    if (!resolvedAccountId) {
      setError('Workspace not loaded. Sign out and sign back in.');
      return;
    }
    if (!createSettings.defaultAssigneeId) {
      setError('Please select a default agent for this website.');
      return;
    }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await api.inboxes.create(resolvedAccountId, inboxPayload(createSettings), token);
      setCreateSettings(emptyWidgetSettings());
      setSuccess('Inbox created.');
      fetchInboxes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create inbox');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingId) return;
    const resolvedAccountId = accountId || (await ensureWorkspace());
    if (!resolvedAccountId) return;
    if (!editSettings.defaultAssigneeId) {
      setError('Please select a default agent for this website.');
      return;
    }
    setSavingEdit(true);
    setError('');
    setSuccess('');
    try {
      await api.inboxes.update(resolvedAccountId, editingId, inboxPayload(editSettings), token);
      setSuccess('Inbox updated.');
      setEditingId(null);
      fetchInboxes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update inbox');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (inboxId: string) => {
    if (!token || !accountId || !confirm('Delete this inbox?')) return;
    try {
      await api.inboxes.remove(accountId, inboxId, token);
      if (expandedId === inboxId) setExpandedId(null);
      if (editingId === inboxId) setEditingId(null);
      fetchInboxes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete inbox');
    }
  };

  const startEdit = (inbox: Inbox) => {
    setEditingId(inbox.id);
    setEditSettings(settingsFromInbox(inbox));
    setExpandedId(null);
    setSuccess('');
    setError('');
  };

  const embedSnippet = (inboxId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flowchat-web-ten.vercel.app';
    const apiUrl = `${origin}/api`;
    const wsUrl = PRODUCTION_WS_URL;
    return `<!-- FlowChat Widget — paste before </body> -->
<script>
  window.flowchat = {
    inboxId: "${inboxId}",
    apiUrl: "${apiUrl}",
    configUrl: "${apiUrl}",
    wsUrl: "${wsUrl}"
  };
</script>
<script src="${origin}/widget.js?v=6" async></script>`;
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Inboxes</h2>
        <p className="text-sm text-gray-500">
          Create and customize web chat widgets. Pick an icon, set colors, then copy the embed code.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Create inbox</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <AgentFields settings={createSettings} onChange={setCreateSettings} />
          <TrustFields settings={createSettings} onChange={setCreateSettings} />
          <WidgetCustomizer settings={createSettings} onChange={setCreateSettings} />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {creating ? 'Creating…' : 'Create inbox'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : inboxes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No inboxes yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {inboxes.map((inbox) => (
              <li key={inbox.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                      style={{ background: inbox.widgetColor ?? '#6366F1' }}
                    >
                      {channelIcon[inbox.channelType] ?? '💬'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inbox.name}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {inbox.channelType.replace('_', ' ')}
                        {inbox.widgetIcon ? ` · ${inbox.widgetIcon} icon` : ''}
                        {!inbox.defaultAssigneeId && (
                          <span className="text-amber-600"> · No agent assigned</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inbox.channelType === 'web_widget' && (
                      <>
                        <button
                          onClick={() => startEdit(inbox)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setExpandedId(expandedId === inbox.id ? null : inbox.id);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {expandedId === inbox.id ? 'Hide embed' : 'Embed code'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(inbox.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === inbox.id && (
                  <form onSubmit={handleEdit} className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900">Edit widget</h4>
                    <AgentFields settings={editSettings} onChange={setEditSettings} />
                    <TrustFields settings={editSettings} onChange={setEditSettings} />
                    <WidgetCustomizer
                      settings={editSettings}
                      onChange={setEditSettings}
                      showNameChannel={false}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg"
                      >
                        {savingEdit ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {expandedId === inbox.id && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Paste this snippet on your website before the closing &lt;/body&gt; tag.
                    </p>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {embedSnippet(inbox.id)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
