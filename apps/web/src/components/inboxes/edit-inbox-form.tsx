'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ensureWorkspace } from '@/lib/workspace';
import { WidgetCustomizer } from '@/components/inboxes/widget-customizer';
import { InboxAgentFields, InboxTrustFields } from '@/components/inboxes/inbox-form-fields';
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

/** Isolated edit form so typing does not re-render sibling inbox rows. */
export function EditInboxForm({ inbox, agents, token, accountId, onSaved, onCancel }: Props) {
  const [settings, setSettings] = useState<WidgetSettingsInput>(() => settingsFromInbox(inbox));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resolvedAccountId = accountId || (await ensureWorkspace());
    if (!resolvedAccountId) return;
    if (!settings.defaultAssigneeId) {
      setError('Please select a default agent for this website.');
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
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100 space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">Edit widget</h4>
      <InboxAgentFields settings={settings} agents={agents} onChange={setSettings} />
      <InboxTrustFields settings={settings} onChange={setSettings} />
      <WidgetCustomizer settings={settings} onChange={setSettings} showNameChannel={false} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
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
