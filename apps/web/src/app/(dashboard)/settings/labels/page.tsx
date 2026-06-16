'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Label } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-page';
import { LabelPill } from '@/components/conversations/conversation-badges';

const COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function LabelsSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [labels, setLabels] = useState<Label[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]!);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.labels.create(accountId, { name: name.trim(), color }, token);
      setName('');
      setShowCreate(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create label');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{labels.length} label{labels.length === 1 ? '' : 's'}</p>
        <Button type="button" size="sm" onClick={() => setShowCreate((o) => !o)}>
          + New label
        </Button>
      </div>

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
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-gray-900' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Add label'}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </SettingsCard>
      )}

      <SettingsCard title="All labels">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2.5">Label</th>
                <th className="px-4 py-2.5">Color</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                    {search ? 'No labels match your search.' : 'No labels yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((label) => (
                  <tr key={label.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <LabelPill name={label.name} color={label.color} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{label.color}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-4">
          ★ Labels appear on conversations and contacts. Use them in filters and segment rules.
        </p>
      </SettingsCard>
    </div>
  );
}
