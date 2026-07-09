'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Inbox } from '@/lib/api';
import { buildWidgetEmbedSnippet } from '@/lib/widget-embed';
import { ensureWorkspace } from '@/lib/workspace';
import { CreateInboxForm } from '@/components/inboxes/create-inbox-form';
import { EditInboxForm } from '@/components/inboxes/edit-inbox-form';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState('');

  const fetchInboxes = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resolvedAccountId = accountId || (await ensureWorkspace());
      if (!resolvedAccountId) return;
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
    } catch {
      setListMessage('Failed to load inboxes.');
    } finally {
      setLoading(false);
    }
  }, [token, accountId]);

  useEffect(() => {
    fetchInboxes();
  }, [fetchInboxes]);

  const handleDelete = async (inboxId: string) => {
    if (!token || !accountId || !confirm('Delete this inbox?')) return;
    try {
      await api.inboxes.remove(accountId, inboxId, token);
      if (expandedId === inboxId) setExpandedId(null);
      if (editingId === inboxId) setEditingId(null);
      fetchInboxes();
    } catch (err: unknown) {
      setListMessage(err instanceof Error ? err.message : 'Failed to delete inbox');
    }
  };

  const embedSnippet = (inboxId: string) => buildWidgetEmbedSnippet(inboxId);

  return (
    <div className="space-y-4">

      {!loading && (
        <p className="text-sm text-gray-500">
          {inboxes.length} active inbox{inboxes.length === 1 ? '' : 'es'}
        </p>
      )}

      <CreateInboxForm
        agents={agents}
        token={token ?? ''}
        accountId={accountId}
        onCreated={fetchInboxes}
      />

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
                        {' · '}
                        {inbox.agentCount ?? 0} agent{(inbox.agentCount ?? 0) === 1 ? '' : 's'}
                        {!inbox.defaultAssigneeId && (
                          <span className="text-amber-600"> · No agent assigned</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0">
                      {inbox.isEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inbox.channelType === 'web_widget' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(inbox.id);
                            setExpandedId(null);
                            setListMessage('');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
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
                      type="button"
                      onClick={() => handleDelete(inbox.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === inbox.id && (
                  <EditInboxForm
                    inbox={inbox}
                    agents={agents}
                    token={token ?? ''}
                    accountId={accountId}
                    onSaved={() => {
                      setEditingId(null);
                      setListMessage('Inbox updated.');
                      fetchInboxes();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}

                {expandedId === inbox.id && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Paste this snippet on your website before the closing &lt;/body&gt; tag.
                    </p>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {embedSnippet(inbox.id)}
                    </pre>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(embedSnippet(inbox.id));
                          setListMessage('Embed code copied to clipboard.');
                        }}
                        className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        📋 Copy code
                      </button>
                      <a
                        href={`/test-widget.html?inboxId=${inbox.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        🧪 Test widget
                      </a>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {listMessage && <p className="px-4 pb-4 text-sm text-green-600">{listMessage}</p>}
      </div>
    </div>
  );
}
