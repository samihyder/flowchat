'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function IntegrationsPage() {
  const { token, accountId } = useAuthStore();
  const [webhooks, setWebhooks] = useState<{ id: string; url: string; events: string[] }[]>([]);
  const [logs, setLogs] = useState<
    { id: string; action: string; actorName: string | null; createdAt: string; resourceType: string }[]
  >([]);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !accountId) return;
    api.webhooks.list(accountId, token).then((r) => setWebhooks(r.webhooks)).catch(() => {});
    api.auditLogs.list(accountId, token).then((r) => setLogs(r.logs)).catch(() => {});
  }, [token, accountId]);

  const createWebhook = async () => {
    if (!token || !accountId || !url.trim()) return;
    const res = await api.webhooks.create(accountId, { url: url.trim() }, token);
    setSecret(res.webhook.secret);
    setUrl('');
    setWebhooks((prev) => [...prev, res.webhook]);
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Webhooks" description="HMAC-signed events for your stack" />
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/flowchat" />
            <Button type="button" onClick={createWebhook}>Add</Button>
          </div>
          {secret && (
            <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg">
              Save this secret now — it won&apos;t be shown again: <code className="font-mono">{secret}</code>
            </p>
          )}
          <ul className="text-sm space-y-2">
            {webhooks.map((w) => (
              <li key={w.id} className="text-gray-700">
                {w.url} <span className="text-gray-400">({w.events.join(', ')})</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Audit log" description="Recent agent and admin actions" />
        <CardBody>
          <ul className="text-sm divide-y divide-gray-100">
            {logs.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-4">
                <span>
                  <span className="font-medium">{l.action}</span>
                  <span className="text-gray-400"> · {l.resourceType}</span>
                  {l.actorName && <span className="text-gray-500"> · {l.actorName}</span>}
                </span>
                <span className="text-gray-400 shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
              </li>
            ))}
            {logs.length === 0 && <p className="text-gray-400">No audit entries yet.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
