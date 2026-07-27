'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuthStore } from '@/store/auth';
import { api, type AiAssistant, type AiDocument } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsCard } from '@/components/ui/settings-page';
import { checkboxClass, labelClass } from '@/components/ui/form-field';

export default function AiAssistantsPage() {
  const { token, accountId } = useAuthStore();
  const [assistants, setAssistants] = useState<AiAssistant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<AiDocument[]>([]);
  const [name, setName] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const res = await api.platformAi.assistants.list(accountId, token);
    setAssistants(res.assistants);
  }, [token, accountId]);

  const loadDocs = useCallback(
    async (assistantId: string) => {
      if (!token || !accountId) return;
      const res = await api.platformAi.assistants.listDocuments(accountId, assistantId, token);
      setDocuments(res.documents);
    },
    [token, accountId]
  );

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (selectedId) loadDocs(selectedId).catch(() => setDocuments([]));
    else setDocuments([]);
  }, [selectedId, loadDocs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.platformAi.assistants.create(
        accountId,
        { name: name.trim(), guidelines: guidelines.trim() || null, isEnabled: true },
        token
      );
      setName('');
      setGuidelines('');
      setMessage('Assistant created.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (a: AiAssistant) => {
    if (!token || !accountId) return;
    try {
      await api.platformAi.assistants.update(accountId, a.id, { isEnabled: !a.isEnabled }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async (a: AiAssistant) => {
    if (!token || !accountId || !confirm(`Delete assistant "${a.name}"?`)) return;
    try {
      await api.platformAi.assistants.remove(accountId, a.id, token);
      if (selectedId === a.id) setSelectedId(null);
      setMessage(`Deleted "${a.name}".`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !selectedId || !docTitle.trim() || !docUrl.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.platformAi.assistants.addDocument(
        accountId,
        selectedId,
        { title: docTitle.trim(), sourceType: 'url', sourceUrl: docUrl.trim() },
        token
      );
      setDocTitle('');
      setDocUrl('');
      setMessage('Document added.');
      await loadDocs(selectedId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Connect your own AI keys (BYOK) under{' '}
        <Link
          href={'/settings/connected-services' as Route}
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          Connected services
        </Link>
        .
      </p>

      <SettingsCard title="Create assistant">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className={labelClass}>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Support copilot" />
          </div>
          <div>
            <label className={labelClass}>Guidelines</label>
            <Textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={3}
              placeholder="Tone, product facts, escalation rules…"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create assistant'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </SettingsCard>

      <SettingsCard title="Assistants">
        {assistants.length === 0 ? (
          <p className="text-sm text-gray-500">No assistants yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {assistants.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                  className="text-left min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                  <p className="text-xs text-gray-400">
                    {a.model} · {a.isEnabled ? 'enabled' : 'disabled'}
                    {selectedId === a.id ? ' · selected' : ''}
                  </p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={a.isEnabled}
                      onChange={() => toggleEnabled(a)}
                    />
                    On
                  </label>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(a)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      {selectedId && (
        <SettingsCard title="Knowledge documents">
          <form onSubmit={handleAddDoc} className="space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Title</label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>URL</label>
                <Input
                  type="url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  required
                  placeholder="https://…"
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              Add document
            </Button>
          </form>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documents.map((d) => (
                <li key={d.id} className="py-2">
                  <p className="text-sm font-medium text-gray-900">{d.title}</p>
                  <p className="text-xs text-gray-400">
                    {d.status} · {d.sourceUrl || d.sourceType}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SettingsCard>
      )}
    </div>
  );
}
