'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Label } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-page';

const COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function LabelsSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [labels, setLabels] = useState<Label[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]!);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !accountId) return;
    const res = await api.labels.list(accountId, token);
    setLabels(res.labels);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [token, accountId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.labels.create(accountId, { name: name.trim(), color }, token);
      setName('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create label');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
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

      <SettingsCard title="All labels">
      <ul className="divide-y divide-gray-100 -mx-1">
        {labels.length === 0 ? (
          <li className="p-6 text-sm text-gray-400 text-center">No labels yet.</li>
        ) : (
          labels.map((label) => (
            <li key={label.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
              <span className="text-sm font-medium text-gray-900">{label.name}</span>
            </li>
          ))
        )}
      </ul>
      </SettingsCard>
    </div>
  );
}
