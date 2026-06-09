'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Inbox } from '@/lib/api';
import { PRODUCTION_API_URL, PRODUCTION_WS_URL } from '@/lib/config';
import { ensureWorkspace } from '@/lib/workspace';

const CHANNELS = [
  { value: 'web_widget', label: 'Website Live Chat', icon: '💬' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { value: 'api', label: 'API Channel', icon: '🔌' },
] as const;

const channelIcon: Record<string, string> = Object.fromEntries(
  CHANNELS.map((c) => [c.value, c.icon])
);

export default function InboxesPage() {
  const { token, accountId } = useAuthStore();
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState<string>('web_widget');
  const [greetingMessage, setGreetingMessage] = useState('Hi! How can we help you today?');
  const [widgetColor, setWidgetColor] = useState('#6366F1');

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
      const res = await api.inboxes.list(resolvedAccountId, token);
      setInboxes(res.inboxes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inboxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, [token, accountId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resolvedAccountId = accountId || (await ensureWorkspace());
    if (!resolvedAccountId) {
      setError('Workspace not loaded. Sign out and sign back in.');
      return;
    }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await api.inboxes.create(
        resolvedAccountId,
        { name, channelType, greetingMessage, widgetColor },
        token
      );
      setName('');
      setSuccess('Inbox created.');
      fetchInboxes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create inbox');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (inboxId: string) => {
    if (!token || !accountId || !confirm('Delete this inbox?')) return;
    try {
      await api.inboxes.remove(accountId, inboxId, token);
      if (expandedId === inboxId) setExpandedId(null);
      fetchInboxes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete inbox');
    }
  };

  const embedSnippet = (inboxId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';
    const apiUrl = PRODUCTION_API_URL;
    const wsUrl = PRODUCTION_WS_URL;
    return `<!-- FlowChat Widget — paste before </body> -->
<script>
  window.flowchat = {
    inboxId: "${inboxId}",
    apiUrl: "${apiUrl}",
    wsUrl: "${wsUrl}"
  };
</script>
<script src="${origin}/widget.js" async></script>`;
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Inboxes</h2>
        <p className="text-sm text-gray-500">
          Create channels where customer conversations arrive. Copy the embed code for web widget inboxes.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Create inbox</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Website Support"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Channel</label>
              <select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch.value} value={ch.value}>
                    {ch.icon} {ch.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {channelType === 'web_widget' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Greeting message</label>
                <input
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Widget color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 font-mono">{widgetColor}</span>
                </div>
              </div>
            </>
          )}
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
                    <span className="text-lg">{channelIcon[inbox.channelType] ?? '💬'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inbox.name}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {inbox.channelType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inbox.channelType === 'web_widget' && (
                      <button
                        onClick={() => setExpandedId(expandedId === inbox.id ? null : inbox.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {expandedId === inbox.id ? 'Hide embed' : 'Embed code'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inbox.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
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
