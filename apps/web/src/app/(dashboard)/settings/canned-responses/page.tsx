'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type CannedResponse } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CannedResponsesPage() {
  const { token, accountId } = useAuthStore();
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    if (!token || !accountId) return;
    api.cannedResponses.list(accountId, token).then((r) => setResponses(r.responses)).catch(() => {});
  };

  useEffect(load, [token, accountId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setError('');
    try {
      await api.cannedResponses.create(accountId, { shortcut, title, content }, token);
      setShortcut('');
      setTitle('');
      setContent('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader title="Canned responses" description="Use /shortcut in the composer to insert" />
        <CardBody>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="shortcut" required />
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Message content"
              required
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Add shortcut</Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <ul className="divide-y divide-gray-100">
            {responses.map((r) => (
              <li key={r.id} className="py-3">
                <p className="font-mono text-sm text-primary-600">/{r.shortcut}</p>
                <p className="font-medium text-gray-900">{r.title}</p>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">{r.content}</p>
              </li>
            ))}
            {responses.length === 0 && <p className="text-sm text-gray-400">No shortcuts yet.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
