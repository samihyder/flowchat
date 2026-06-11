'use client';

import { useState } from 'react';
import { api, type AnalyticsException } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

type Props = {
  accountId: string;
  inboxId: string;
  token: string;
  isAdmin: boolean;
  exceptions: AnalyticsException[];
  onChange: () => void;
};

export function AnalyticsExceptionsPanel({
  accountId,
  inboxId,
  token,
  isAdmin,
  exceptions,
  onChange,
}: Props) {
  const [type, setType] = useState<'ip' | 'machine'>('ip');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.inboxes.addAnalyticsException(
        accountId,
        inboxId,
        { type, value: value.trim(), label: label.trim() || undefined },
        token
      );
      setValue('');
      setLabel('');
      onChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add exception');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this analytics exception? Stats will include this traffic again.')) return;
    try {
      await api.inboxes.removeAnalyticsException(accountId, inboxId, id, token);
      onChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  return (
    <Card>
      <CardHeader
        title="Analytics exclusions"
        description="Exclude office IPs or test machines from visit and conversation metrics. Live chat is unaffected."
      />
      <CardBody className="space-y-4">
        {isAdmin ? (
          <form onSubmit={add} className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'ip' | 'machine')}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="ip">IP address</option>
                <option value="machine">Machine / browser ID</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {type === 'ip' ? 'IP address' : 'Source ID (machine)'}
              </label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === 'ip' ? '203.0.113.10' : 'v_abc123…'}
                required
                className="font-mono text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Office VPN"
              />
            </div>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Adding…' : 'Add exclusion'}
            </Button>
          </form>
        ) : (
          <p className="text-xs text-gray-500">Only admins can manage analytics exclusions.</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-400">No exclusions — all traffic is counted in stats.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {exceptions.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="inline-block text-[10px] uppercase font-semibold text-gray-500 mr-2">
                    {ex.type === 'ip' ? 'IP' : 'Machine'}
                  </span>
                  <code className="text-xs text-gray-800 break-all">{ex.value}</code>
                  {ex.label && <span className="text-xs text-gray-400 ml-2">({ex.label})</span>}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => remove(ex.id)}
                    className="text-xs text-red-600 hover:text-red-800 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
