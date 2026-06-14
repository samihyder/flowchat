'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { getApiUrl } from '@/lib/config';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CONTACT_EVENTS = ['contact.created', 'contact.updated', 'contact.deleted'];

export default function IntegrationsPage() {
  const { token, accountId } = useAuthStore();
  const [webhooks, setWebhooks] = useState<{ id: string; url: string; events: string[] }[]>([]);
  const [apiKeys, setApiKeys] = useState<
    { id: string; name: string; keyPrefix: string; scopes: string[]; enabled: boolean }[]
  >([]);
  const [logs, setLogs] = useState<
    { id: string; action: string; actorName: string | null; createdAt: string; resourceType: string }[]
  >([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('HubSpot sync');
  const [apiKeySecret, setApiKeySecret] = useState<string | null>(null);
  const baseUrl = typeof window !== 'undefined' ? getApiUrl() : 'https://your-app.vercel.app/api';

  const load = () => {
    if (!token || !accountId) return;
    api.webhooks.list(accountId, token).then((r) => setWebhooks(r.webhooks)).catch(() => {});
    api.apiKeys.list(accountId, token).then((r) => setApiKeys(r.apiKeys)).catch(() => {});
    api.auditLogs.list(accountId, token).then((r) => setLogs(r.logs)).catch(() => {});
  };

  useEffect(load, [token, accountId]);

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

  const createApiKey = async () => {
    if (!token || !accountId) return;
    const res = await api.apiKeys.create(accountId, { name: keyName.trim() || 'Integration' }, token);
    setApiKeySecret(res.secret);
    load();
  };

  const revokeKey = async (keyId: string) => {
    if (!token || !accountId) return;
    await api.apiKeys.remove(accountId, keyId, token);
    load();
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">CRM integrations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sync contacts with HubSpot, Salesforce, Zapier, LeadSnapper, or custom apps via API keys (inbound) and webhooks (outbound).
        </p>
      </div>

      <Card>
        <CardHeader title="API keys (incoming)" description="External apps push/pull contacts into FlowChat" />
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
              <li key={k.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{k.name}</span>{' '}
                  <code className="text-gray-400">{k.keyPrefix}…</code>
                  <span className="text-gray-400 ml-2">({k.scopes.join(', ')})</span>
                </span>
                <Button type="button" variant="danger" size="sm" onClick={() => void revokeKey(k.id)}>
                  Revoke
                </Button>
              </li>
            ))}
            {apiKeys.length === 0 && <p className="text-gray-400">No API keys yet.</p>}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Webhooks (outgoing)" description="FlowChat notifies your app when contacts change" />
        <CardBody className="space-y-4">
          <p className="text-xs text-gray-500">
            Events: {CONTACT_EVENTS.join(', ')}. Signed with <code>X-FlowChat-Signature</code> (HMAC-SHA256).
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
              <li key={w.id} className="text-gray-700 break-all">
                {w.url} <span className="text-gray-400">({w.events.join(', ')})</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Inbound payload example" description="POST /integrations/v1/contacts/inbound" />
        <CardBody>
          <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">{`{
  "contacts": [
    {
      "externalId": "hubspot-12345",
      "name": "Jane Doe",
      "email": "jane@company.com",
      "phone": "+15551234567",
      "type": "lead"
    }
  ]
}`}</pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Audit log" description="Recent integration and admin actions" />
        <CardBody>
          <ul className="text-sm divide-y divide-gray-100">
            {logs.slice(0, 20).map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-4">
                <span>
                  <span className="font-medium">{l.action}</span>
                  <span className="text-gray-400"> · {l.resourceType}</span>
                </span>
                <span className="text-gray-400 shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
