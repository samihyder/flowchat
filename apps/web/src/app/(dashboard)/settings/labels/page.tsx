'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Label } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-page';
import { LabelPill } from '@/components/conversations/conversation-badges';
import { LabelColorPicker } from '@/components/settings/label-color-picker';
import { RECOMMENDED_LABELS, missingRecommendedLabels } from '@/lib/labels/defaults';
import { normalizeLabelColor } from '@/lib/labels/colors';

type LabelRow = Label & { createdAt: string; conversationCount: number };

export default function LabelsSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#06B6D4');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#06B6D4');

  const load = async () => {
    if (!token || !accountId) return;
    const res = await api.labels.list(accountId, token);
    setLabels(res.labels);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [token, accountId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labels;
    return labels.filter((l) => l.name.toLowerCase().includes(q));
  }, [labels, search]);

  const missingRecommended = useMemo(() => missingRecommendedLabels(labels), [labels]);

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(normalizeLabelColor(label.color));
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('#06B6D4');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.labels.create(
        accountId,
        { name: name.trim(), color: normalizeLabelColor(color) },
        token
      );
      setName('');
      setColor('#06B6D4');
      setShowCreate(false);
      setMessage(`Label "${name.trim()}" created.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create label');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (labelId: string) => {
    if (!token || !accountId || !editName.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.labels.update(
        accountId,
        labelId,
        { name: editName.trim(), color: normalizeLabelColor(editColor) },
        token
      );
      setMessage(`Label "${editName.trim()}" updated.`);
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update label');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (label: Label) => {
    if (!token || !accountId) return;
    if (!window.confirm(`Delete label "${label.name}"? It will be removed from all conversations and contacts.`)) {
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.labels.delete(accountId, label.id, token);
      if (editingId === label.id) cancelEdit();
      setMessage(`Label "${label.name}" deleted.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete label');
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
      const res = await api.labels.seedRecommended(accountId, token);
      await load();
      setMessage(
        `Recommended labels ready: ${res.created} added` +
          (res.updated ? `, ${res.updated} colours updated` : '') +
          (res.skipped ? `, ${res.skipped} already up to date` : '') +
          '.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add recommended labels');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {labels.length} label{labels.length === 1 ? '' : 's'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={seeding}
            onClick={() => void handleSeedRecommended()}
          >
            {seeding ? 'Adding…' : 'Add recommended labels'}
          </Button>
          <Button type="button" size="sm" onClick={() => setShowCreate((o) => !o)}>
            + New label
          </Button>
        </div>
      </div>

      {missingRecommended.length > 0 && missingRecommended.length < RECOMMENDED_LABELS.length && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {missingRecommended.length} recommended label
          {missingRecommended.length === 1 ? '' : 's'} missing:{' '}
          {missingRecommended.map((d) => d.name).join(', ')}. Click <strong>Add recommended labels</strong> to
          add them.
        </p>
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search labels…"
        className="max-w-sm"
      />

      {showCreate && (
        <SettingsCard title="Create label">
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Label name"
              required
            />
            <LabelColorPicker value={color} onChange={setColor} />
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Add label'}
            </Button>
          </form>
        </SettingsCard>
      )}

      <SettingsCard title="All labels">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2.5">Label</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Purpose</th>
                <th className="px-4 py-2.5">Conversations</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Created</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    {search ? (
                      'No labels match your search.'
                    ) : (
                      <span>
                        No labels yet. Click <strong>Add recommended labels</strong> for the standard sales set.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((label) => {
                  const recommended = RECOMMENDED_LABELS.find(
                    (d) => d.name.toLowerCase() === label.name.toLowerCase()
                  );
                  const isEditing = editingId === label.id;

                  if (isEditing) {
                    return (
                      <tr key={label.id} className="bg-primary-50/40">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-3 max-w-md">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Label name"
                              required
                            />
                            <LabelColorPicker value={editColor} onChange={setEditColor} />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={saving || !editName.trim()}
                                onClick={() => void handleUpdate(label.id)}
                              >
                                {saving ? 'Saving…' : 'Save changes'}
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={label.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <LabelPill name={label.name} color={label.color} />
                        <p className="text-[11px] font-mono text-gray-400 mt-1 sm:hidden">{label.color}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                        {recommended?.description ?? 'Custom label'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{label.conversationCount}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {new Date(label.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(label)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(label)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-4">
          Labels appear on conversations and contacts. Use them in inbox filters and marketing segments.
        </p>
      </SettingsCard>

      <SettingsCard title="Recommended set (one click)">
        <p className="text-sm text-gray-600 mb-3">
          Adds or updates the standard sales labels for LeadSnapper + FlowChat. Existing names are kept; colours
          are refreshed to match the guide.
        </p>
        <ul className="grid sm:grid-cols-2 gap-2 text-xs">
          {RECOMMENDED_LABELS.map((d) => (
            <li key={d.name} className="flex items-center gap-2 text-gray-700">
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-gray-200"
                style={{ backgroundColor: d.color }}
              />
              <span className="font-medium">{d.name}</span>
              <span className="text-gray-400 truncate">— {d.description}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
