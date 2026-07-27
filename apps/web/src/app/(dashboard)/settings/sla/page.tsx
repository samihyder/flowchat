'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Inbox, type SlaPolicy } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-page';
import { checkboxClass, labelClass, selectClass } from '@/components/ui/form-field';

export default function SlaSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [inboxPolicy, setInboxPolicy] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [firstResponseMinutes, setFirstResponseMinutes] = useState('15');
  const [nextResponseMinutes, setNextResponseMinutes] = useState('60');
  const [resolutionMinutes, setResolutionMinutes] = useState('480');
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const [pol, inboxRes] = await Promise.all([
      api.sla.policies.list(accountId, token),
      api.inboxes.list(accountId, token),
    ]);
    setPolicies(pol.policies);
    setInboxes(inboxRes.inboxes);

    const map: Record<string, string> = {};
    await Promise.all(
      inboxRes.inboxes.map(async (inbox) => {
        try {
          const r = await api.inboxes.sla.get(accountId, inbox.id, token);
          if (r.policy) map[inbox.id] = r.policy.id;
        } catch {
          /* no policy attached */
        }
      })
    );
    setInboxPolicy(map);
  }, [token, accountId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.sla.policies.create(
        accountId,
        {
          name: name.trim(),
          firstResponseMinutes: Number(firstResponseMinutes) || null,
          nextResponseMinutes: Number(nextResponseMinutes) || null,
          resolutionMinutes: Number(resolutionMinutes) || null,
          useBusinessHours,
          isEnabled: true,
        },
        token
      );
      setName('');
      setMessage('Policy created.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy: SlaPolicy) => {
    if (!token || !accountId || !confirm(`Delete policy "${policy.name}"?`)) return;
    try {
      await api.sla.policies.remove(accountId, policy.id, token);
      setMessage(`Deleted "${policy.name}".`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const attachPolicy = async (inboxId: string, policyId: string) => {
    if (!token || !accountId || !policyId) return;
    try {
      await api.inboxes.sla.attach(accountId, inboxId, policyId, token);
      setInboxPolicy((m) => ({ ...m, [inboxId]: policyId }));
      setMessage('SLA attached to inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to attach SLA');
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard title="Create SLA policy">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className={labelClass}>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Standard support" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>First response (min)</label>
              <Input
                type="number"
                min={1}
                value={firstResponseMinutes}
                onChange={(e) => setFirstResponseMinutes(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Next response (min)</label>
              <Input
                type="number"
                min={1}
                value={nextResponseMinutes}
                onChange={(e) => setNextResponseMinutes(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Resolution (min)</label>
              <Input
                type="number"
                min={1}
                value={resolutionMinutes}
                onChange={(e) => setResolutionMinutes(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={useBusinessHours}
              onChange={(e) => setUseBusinessHours(e.target.checked)}
            />
            Use business hours
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create policy'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </SettingsCard>

      <SettingsCard title="Policies">
        {policies.length === 0 ? (
          <p className="text-sm text-gray-500">No SLA policies yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {policies.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    FRT {p.firstResponseMinutes ?? '—'}m · Next {p.nextResponseMinutes ?? '—'}m · Res{' '}
                    {p.resolutionMinutes ?? '—'}m
                  </p>
                </div>
                <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(p)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard title="Attach to inboxes">
        {inboxes.length === 0 ? (
          <p className="text-sm text-gray-500">No inboxes yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {inboxes.map((inbox) => (
              <li key={inbox.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <p className="text-sm font-medium text-gray-900">{inbox.name}</p>
                <select
                  value={inboxPolicy[inbox.id] ?? ''}
                  onChange={(e) => attachPolicy(inbox.id, e.target.value)}
                  className={`${selectClass} sm:max-w-xs`}
                  disabled={policies.length === 0}
                >
                  <option value="">Select policy…</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  );
}
