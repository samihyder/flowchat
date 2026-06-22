'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type CannedResponse } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/ui/settings-page';
import {
  RECOMMENDED_CANNED_RESPONSES,
  missingRecommendedCanned,
} from '@/lib/canned-responses/defaults';

export default function CannedResponsesPage() {
  const { token, accountId } = useAuthStore();
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShortcut, setEditShortcut] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (autoSeedIfEmpty = false) => {
    if (!token || !accountId) return;
    const r = await api.cannedResponses.list(accountId, token);
    if (r.responses.length === 0 && autoSeedIfEmpty) {
      const seeded = await api.cannedResponses.seedRecommended(accountId, token);
      setResponses(seeded.responses);
      setMessage('10 starter canned responses added — edit any message below to match your tone.');
      return;
    }
    setResponses(r.responses);
  }, [token, accountId]);

  useEffect(() => {
    load(true).catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter(
      (r) =>
        r.shortcut.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
    );
  }, [responses, search]);

  const missingRecommended = useMemo(() => missingRecommendedCanned(responses), [responses]);

  const resetCreateForm = () => {
    setShortcut('');
    setTitle('');
    setContent('');
  };

  const startEdit = (r: CannedResponse) => {
    setEditingId(r.id);
    setEditShortcut(r.shortcut);
    setEditTitle(r.title);
    setEditContent(r.content);
    setError('');
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditShortcut('');
    setEditTitle('');
    setEditContent('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    const sc = shortcut.trim().toLowerCase();
    const t = title.trim();
    const c = content.trim();
    if (!sc || !t || !c) {
      setError('Shortcut, title, and message are required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.cannedResponses.create(accountId, { shortcut: sc, title: t, content: c }, token);
      resetCreateForm();
      setShowCreate(false);
      setMessage(`Canned response /${sc} added.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (responseId: string) => {
    if (!token || !accountId) return;
    const sc = editShortcut.trim().toLowerCase();
    const t = editTitle.trim();
    const c = editContent.trim();
    if (!sc || !t || !c) {
      setError('Shortcut, title, and message are required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.cannedResponses.update(
        accountId,
        responseId,
        { shortcut: sc, title: t, content: c },
        token
      );
      setMessage(`Canned response /${sc} updated.`);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: CannedResponse) => {
    if (!token || !accountId) return;
    if (!window.confirm(`Delete /${r.shortcut} — "${r.title}"?`)) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.cannedResponses.delete(accountId, r.id, token);
      if (editingId === r.id) cancelEdit();
      setMessage(`Deleted /${r.shortcut}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedRecommended = async () => {
    if (!token || !accountId) return;
    setSeeding(true);
    setError('');
    setMessage('');
    try {
      const res = await api.cannedResponses.seedRecommended(accountId, token);
      setResponses(res.responses);
      setMessage(
        `Starter messages ready: ${res.created} added` +
          (res.skipped ? `, ${res.skipped} already existed (edit those below)` : '') +
          '.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add starter messages');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {responses.length} canned response{responses.length === 1 ? '' : 's'} · type{' '}
          <span className="font-mono text-primary-600">/shortcut</span> in chat to insert
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={seeding}
            onClick={() => void handleSeedRecommended()}
          >
            {seeding ? 'Adding…' : 'Add 10 starter messages'}
          </Button>
          <Button type="button" size="sm" onClick={() => setShowCreate((o) => !o)}>
            + Add canned response
          </Button>
        </div>
      </div>

      {missingRecommended.length > 0 && missingRecommended.length < RECOMMENDED_CANNED_RESPONSES.length && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {missingRecommended.length} starter shortcut
          {missingRecommended.length === 1 ? '' : 's'} missing (e.g.{' '}
          {missingRecommended
            .slice(0, 3)
            .map((d) => `/${d.shortcut}`)
            .join(', ')}
          ). Click <strong>Add 10 starter messages</strong> to add them without overwriting existing
          ones.
        </p>
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search shortcuts or text…"
        className="max-w-sm"
      />

      {showCreate && (
        <SettingsCard title="New canned response">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Shortcut</label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">/</span>
                  <Input
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value.replace(/\s/g, ''))}
                    placeholder="demo"
                    required
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Book a demo"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Message</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Message inserted into the chat composer…"
                required
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Adding…' : 'Add canned response'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SettingsCard>
      )}

      <SettingsCard title="All canned responses">
        <ul className="divide-y divide-gray-100 -mx-1">
          {filtered.length === 0 ? (
            <li className="px-1 py-8 text-center text-sm text-gray-400">
              {search ? (
                'No matches.'
              ) : (
                <span>
                  No canned responses yet. Click <strong>Add 10 starter messages</strong> or{' '}
                  <strong>+ Add canned response</strong>.
                </span>
              )}
            </li>
          ) : (
            filtered.map((r) => {
              const recommended = RECOMMENDED_CANNED_RESPONSES.find(
                (d) => d.shortcut.toLowerCase() === r.shortcut.toLowerCase()
              );
              const isEditing = editingId === r.id;

              if (isEditing) {
                return (
                  <li key={r.id} className="py-4 px-1 bg-primary-50/40 rounded-lg my-1">
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">
                            Shortcut
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-sm">/</span>
                            <Input
                              value={editShortcut}
                              onChange={(e) =>
                                setEditShortcut(e.target.value.replace(/\s/g, ''))
                              }
                              className="font-mono"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Message</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={saving}
                          onClick={() => void handleUpdate(r.id)}
                        >
                          {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li key={r.id} className="py-3 px-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-primary-600">/{r.shortcut}</p>
                      <p className="font-medium text-gray-900">{r.title}</p>
                      {recommended && (
                        <p className="text-xs text-gray-400 mt-0.5">{recommended.description}</p>
                      )}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{r.content}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(r)}
                        disabled={saving}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-4">
          In a conversation, type <span className="font-mono">/</span> then a shortcut (e.g.{' '}
          <span className="font-mono">/demo</span>) to insert the message. Edit any starter text to
          match your tone before going live.
        </p>
      </SettingsCard>

      <SettingsCard title="10 starter shortcuts (one click)">
        <p className="text-sm text-gray-600 mb-3">
          Adds missing defaults only — existing shortcuts with the same name are left unchanged so
          your edits are kept.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-700">
          {RECOMMENDED_CANNED_RESPONSES.map((d) => (
            <li key={d.shortcut}>
              <span className="font-mono text-primary-600">/{d.shortcut}</span>
              <span className="text-gray-500"> — {d.title}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
