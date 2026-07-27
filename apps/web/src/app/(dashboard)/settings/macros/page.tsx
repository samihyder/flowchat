'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MacroRecord } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-page';
import { labelClass, selectClass } from '@/components/ui/form-field';

export default function MacrosPage() {
  const { token, accountId } = useAuthStore();
  const [macros, setMacros] = useState<MacroRecord[]>([]);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('global');
  const [actionKind, setActionKind] = useState<'change_status' | 'add_label'>('change_status');
  const [labelId, setLabelId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const res = await api.automation.macros.list(accountId, token);
    setMacros(res.macros);
  }, [token, accountId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    if (actionKind === 'add_label' && !labelId.trim()) {
      setError('Label ID is required for add_label.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const actions =
        actionKind === 'change_status'
          ? [{ actionType: 'change_status', config: { status: 'resolved' } }]
          : [{ actionType: 'add_label', config: { labelId: labelId.trim() } }];
      await api.automation.macros.create(
        accountId,
        { name: name.trim(), visibility, actions },
        token
      );
      setName('');
      setLabelId('');
      setMessage('Macro created.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create macro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (macro: MacroRecord) => {
    if (!token || !accountId || !confirm(`Delete macro "${macro.name}"?`)) return;
    try {
      await api.automation.macros.remove(accountId, macro.id, token);
      setMessage(`Deleted "${macro.name}".`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard title="Create macro">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Resolve & tag"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className={selectClass}
              >
                <option value="global">Global</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Action</label>
              <select
                value={actionKind}
                onChange={(e) => setActionKind(e.target.value as 'change_status' | 'add_label')}
                className={selectClass}
              >
                <option value="change_status">Change status → resolve</option>
                <option value="add_label">Add label</option>
              </select>
            </div>
            {actionKind === 'add_label' && (
              <div>
                <label className={labelClass}>Label ID</label>
                <Input
                  value={labelId}
                  onChange={(e) => setLabelId(e.target.value)}
                  placeholder="Label UUID"
                  required
                />
              </div>
            )}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create macro'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </SettingsCard>

      <SettingsCard title="Macros">
        {macros.length === 0 ? (
          <p className="text-sm text-gray-500">No macros yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {macros.map((macro) => (
              <li key={macro.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{macro.name}</p>
                  <p className="text-xs text-gray-400">
                    {macro.visibility} ·{' '}
                    {macro.actions.map((a) => a.actionType).join(', ') || 'no actions'}
                  </p>
                </div>
                <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(macro)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  );
}
