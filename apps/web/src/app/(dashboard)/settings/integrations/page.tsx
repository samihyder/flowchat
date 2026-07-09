'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { getApiUrl } from '@/lib/config';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabBar } from '@/components/ui/tabs';

const CONTACT_EVENTS = ['contact.created', 'contact.updated', 'contact.deleted'];
const ALL_EVENTS = [
  'conversation.created',
  'message.created',
  'conversation.resolved',
  'contact.created',
  'contact.updated',
  'contact.deleted',
];
const TABS = [
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'audit', label: 'Audit Log' },
];

type Webhook = { id: string; url: string; events: string[]; enabled: boolean };
type Delivery = {
  id: string;
  event: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export default function IntegrationsPage() {
  const { token, accountId } = useAuthStore();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [apiKeys, setApiKeys] = useState<
    { id: string; name: string; keyPrefix: string; scopes: string[]; enabled: boolean }[]
  >([]);
  const [logs, setLogs] = useState<
    {
      id: string;
      action: string;
      actorName: string | null;
      createdAt: string;
      resourceType: string;
      ipAddress: string | null;
    }[]
  >([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('HubSpot sync');
  const [apiKeySecret, setApiKeySecret] = useState<string | null>(null);
  const [tab, setTab] = useState('webhooks');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyName, setEditingKeyName] = useState('');
  const baseUrl = typeof window !== 'undefined' ? getApiUrl() : 'https://your-app.vercel.app/api';

  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [editingWebhookUrl, setEditingWebhookUrl] = useState('');
  const [editingWebhookEvents, setEditingWebhookEvents] = useState<string[]>([]);
  const [deliveriesFor, setDeliveriesFor] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const [actionFilter, setActionFilter] = useState('');
  const [sinceFilter, setSinceFilter] = useState('');
  const [untilFilter, setUntilFilter] = useState('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  const loadLogs = () => {
    if (!token || !accountId) return;
    api.auditLogs
      .list(accountId, token, {
        action: actionFilter || undefined,
        since: sinceFilter ? new Date(sinceFilter).toISOString() : undefined,
        until: untilFilter ? new Date(`${untilFilter}T23:59:59`).toISOString() : undefined,
      })
      .then((r) => {
        setLogs(r.logs);
        setAvailableActions((prev) => Array.from(new Set([...prev, ...r.logs.map((l) => l.action)])).sort());
      })
      .catch(() => {});
  };

  const load = () => {
    if (!token || !accountId) return;
    api.webhooks.list(accountId, token).then((r) => setWebhooks(r.webhooks)).catch(() => {});
    api.apiKeys.list(accountId, token).then((r) => setApiKeys(r.apiKeys)).catch(() => {});
    loadLogs();
  };

  useEffect(load, [token, accountId]);
  useEffect(loadLogs, [actionFilter, sinceFilter, untilFilter]);

  const createWebhook = async () => {
    if (!token || !accountId || !webhookUrl.trim()) return;
    const res = await api.webhooks.create(
      accountId,
      { url: webhookUrl.trim(), events: CONTACT_EVENTS },
      token
    );
    setWebhookSecret(res.webhook.secret);
    setWebhookUrl('');
    load();
  };

  const startEditWebhook = (w: Webhook) => {
    setEditingWebhookId(w.id);
    setEditingWebhookUrl(w.url);
    setEditingWebhookEvents(w.events);
  };

  const saveWebhook = async (id: string) => {
    if (!token || !accountId || !editingWebhookUrl.trim() || editingWebhookEvents.length === 0) return;
    await api.webhooks.update(accountId, id, { url: editingWebhookUrl.trim(), events: editingWebhookEvents }, token);
    setEditingWebhookId(null);
    load();
  };

  const toggleWebhookEnabled = async (w: Webhook) => {
    if (!token || !accountId) return;
    await api.webhooks.update(accountId, w.id, { enabled: !w.enabled }, token);
    load();
  };

  const deleteWebhook = async (id: string) => {
    if (!token || !accountId) return;
    if (!confirm('Delete this webhook?')) return;
    await api.webhooks.remove(accountId, id, token);
    if (deliveriesFor === id) setDeliveriesFor(null);
    load();
  };

  const toggleEditEvent = (event: string) => {
    setEditingWebhookEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  const viewDeliveries = async (id: string) => {
    if (!token || !accountId) return;
    if (deliveriesFor === id) {
      setDeliveriesFor(null);
      return;
    }
    setDeliveriesFor(id);
    const res = await api.webhooks.deliveries(accountId, id, token);
    setDeliveries(res.deliveries);
  };

  const createApiKey = async () => {
    if (!token || !accountId) return;
    const res = await api.apiKeys.create(accountId, { name: keyName.trim() || 'Integration' }, token);
    setApiKeySecret(res.secret);
    load();
  };

  const revokeKey = async (keyId: string) => {
    if (!token || !accountId) return;
    await api.apiKeys.remove(accountId, keyId, token);
    if (editingKeyId === keyId) setEditingKeyId(null);
    load();
  };

  const saveKeyName = async (keyId: string) => {
    if (!token || !accountId || !editingKeyName.trim()) return;
    await api.apiKeys.update(accountId, keyId, { name: editingKeyName.trim() }, token);
    setEditingKeyId(null);
    load();
  };

  return (
    <div className="space-y-4">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'api-keys' && (
      <Card>
        <CardHeader title="API keys (incoming)" description="Stored permanently in the database. Rename anytime; full key is only shown once at creation." />
        <CardBody className="space-y-4">
          <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono space-y-1 overflow-x-auto">
            <p>POST {baseUrl}/integrations/v1/contacts/inbound</p>
            <p>POST {baseUrl}/integrations/v1/leadsnapper/leads</p>
            <p>GET/PATCH/DELETE {baseUrl}/integrations/v1/contacts/…</p>
            <p>Authorization: Bearer fc_live_…</p>
          </div>
          <div className="flex gap-2">
            <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name" />
            <Button type="button" onClick={createApiKey}>Create API key</Button>
          </div>
          {apiKeySecret && (
            <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg break-all">
              Save this key now — it won&apos;t be shown again:{' '}
              <code className="font-mono">{apiKeySecret}</code>
            </p>
          )}
          <ul className="text-sm space-y-2">
            {apiKeys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg p-3">
                {editingKeyId === k.id ? (
                  <div className="flex flex-1 gap-2 items-center">
                    <Input value={editingKeyName} onChange={(e) => setEditingKeyName(e.target.value)} />
                    <Button type="button" size="sm" onClick={() => void saveKeyName(k.id)}>
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setEditingKeyId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>
                      <span className="font-medium">{k.name}</span>{' '}
                      <code className="text-gray-400">{k.keyPrefix}…</code>
                      <span className="text-gray-400 ml-2">({k.scopes.join(', ')})</span>
                      {!k.enabled && <span className="text-amber-600 ml-2">disabled</span>}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingKeyId(k.id);
                          setEditingKeyName(k.name);
                        }}
                      >
                        Edit
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => void revokeKey(k.id)}>
                        Revoke
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {apiKeys.length === 0 && <p className="text-gray-400">No API keys yet.</p>}
          </ul>
        </CardBody>
      </Card>
      )}

      {tab === 'webhooks' && (
      <Card>
        <CardHeader title="Webhooks (outgoing)" description="FlowChat notifies your app when events happen" />
        <CardBody className="space-y-4">
          <p className="text-xs text-gray-500">
            Signed with <code>X-FlowChat-Signature</code> (HMAC-SHA256).
          </p>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks/flowchat"
            />
            <Button type="button" onClick={createWebhook}>Add webhook</Button>
          </div>
          {webhookSecret && (
            <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg">
              Webhook secret: <code className="font-mono">{webhookSecret}</code>
            </p>
          )}
          <ul className="text-sm space-y-2">
            {webhooks.map((w) => (
              <li key={w.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                {editingWebhookId === w.id ? (
                  <div className="space-y-2">
                    <Input value={editingWebhookUrl} onChange={(e) => setEditingWebhookUrl(e.target.value)} />
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_EVENTS.map((event) => (
                        <button
                          key={event}
                          type="button"
                          onClick={() => toggleEditEvent(event)}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            editingWebhookEvents.includes(event)
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {event}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => void saveWebhook(w.id)}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingWebhookId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-gray-700 break-all">
                          {w.url}
                          {!w.enabled && <span className="ml-2 text-xs text-amber-600">disabled</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{w.events.join(', ')}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" variant="secondary" size="sm" onClick={() => void toggleWebhookEnabled(w)}>
                          {w.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => startEditWebhook(w)}>
                          Edit
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => void viewDeliveries(w.id)}>
                          {deliveriesFor === w.id ? 'Hide log' : 'Delivery log'}
                        </Button>
                        <Button type="button" variant="danger" size="sm" onClick={() => void deleteWebhook(w.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    {deliveriesFor === w.id && (
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        {deliveries.length === 0 ? (
                          <p className="text-xs text-gray-400">No deliveries yet.</p>
                        ) : (
                          <ul className="text-xs space-y-1">
                            {deliveries.map((d) => (
                              <li key={d.id} className="flex items-center justify-between gap-2">
                                <span className="text-gray-600">
                                  {d.event} ·{' '}
                                  <span
                                    className={
                                      d.status === 'delivered'
                                        ? 'text-green-700'
                                        : d.status === 'failed'
                                          ? 'text-red-700'
                                          : 'text-amber-700'
                                    }
                                  >
                                    {d.status}
                                  </span>{' '}
                                  ({d.attempts} attempt{d.attempts === 1 ? '' : 's'})
                                  {d.lastError && <span className="text-red-500"> — {d.lastError}</span>}
                                </span>
                                <span className="text-gray-400 shrink-0">
                                  {new Date(d.createdAt).toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
            {webhooks.length === 0 && <p className="text-gray-400">No webhooks yet.</p>}
          </ul>
        </CardBody>
      </Card>
      )}

      {tab === 'audit' && (
      <Card>
        <CardHeader title="Audit log" description="Recent integration and admin actions" />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">All actions</option>
              {availableActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={sinceFilter}
              onChange={(e) => setSinceFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
              aria-label="From date"
            />
            <input
              type="date"
              value={untilFilter}
              onChange={(e) => setUntilFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
              aria-label="To date"
            />
            {(actionFilter || sinceFilter || untilFilter) && (
              <button
                type="button"
                onClick={() => {
                  setActionFilter('');
                  setSinceFilter('');
                  setUntilFilter('');
                }}
                className="text-xs text-primary-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.slice(0, 30).map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 font-medium">{l.action}</td>
                  <td className="px-3 py-2 text-gray-500">{l.resourceType}</td>
                  <td className="px-3 py-2 text-gray-500">{l.actorName ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono text-xs">{l.ipAddress ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    No matching log entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
      )}
    </div>
  );
}
