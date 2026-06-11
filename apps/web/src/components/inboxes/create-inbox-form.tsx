'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ensureWorkspace } from '@/lib/workspace';
import { WidgetCustomizer } from '@/components/inboxes/widget-customizer';
import { InboxAgentFields, InboxTrustFields } from '@/components/inboxes/inbox-form-fields';
import { inboxPayloadFromSettings } from '@/components/inboxes/inbox-payload';
import { emptyWidgetSettings, type WidgetSettingsInput } from '@/lib/widget-theme';

type AgentOption = { userId: string; name: string; email: string };

type Props = {
  agents: AgentOption[];
  token: string;
  accountId: string | null;
  onCreated: () => void;
};

/** Isolated create form so typing does not re-render the inbox list. */
export function CreateInboxForm({ agents, token, accountId, onCreated }: Props) {
  const [settings, setSettings] = useState<WidgetSettingsInput>(emptyWidgetSettings());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resolvedAccountId = accountId || (await ensureWorkspace());
    if (!resolvedAccountId) {
      setError('Workspace not loaded. Sign out and sign back in.');
      return;
    }
    if (!settings.defaultAssigneeId) {
      setError('Please select a default agent for this website.');
      return;
    }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await api.inboxes.create(resolvedAccountId, inboxPayloadFromSettings(settings), token);
      setSettings(emptyWidgetSettings());
      setSuccess('Inbox created.');
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create inbox');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Create inbox</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InboxAgentFields settings={settings} agents={agents} onChange={setSettings} />
        <InboxTrustFields settings={settings} onChange={setSettings} />
        <WidgetCustomizer settings={settings} onChange={setSettings} />
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
  );
}
