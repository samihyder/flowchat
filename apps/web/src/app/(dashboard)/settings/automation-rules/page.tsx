'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type AutomationRuleSummary } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-page';
import { checkboxClass, labelClass, selectClass } from '@/components/ui/form-field';

const TRIGGERS = [
  { value: 'conversation.created', label: 'Conversation created' },
  { value: 'message.created', label: 'Message created' },
  { value: 'conversation.resolved', label: 'Conversation resolved' },
  { value: 'contact.created', label: 'Contact created' },
] as const;

export default function AutomationRulesPage() {
  const { token, accountId } = useAuthStore();
  const [rules, setRules] = useState<AutomationRuleSummary[]>([]);
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<string>('conversation.created');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const res = await api.automation.rules.list(accountId, token);
    setRules(res.rules);
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
      await api.automation.rules.create(
        accountId,
        {
          name: name.trim(),
          triggerEvent,
          isEnabled: true,
          actions: [
            {
              sortOrder: 0,
              actionType: 'add_private_note',
              config: { content: `Automation: ${name.trim()} fired on ${triggerEvent}` },
            },
          ],
        },
        token
      );
      setName('');
      setMessage('Rule created.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (rule: AutomationRuleSummary) => {
    if (!token || !accountId) return;
    try {
      await api.automation.rules.update(accountId, rule.id, { isEnabled: !rule.isEnabled }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const handleDelete = async (rule: AutomationRuleSummary) => {
    if (!token || !accountId || !confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      await api.automation.rules.remove(accountId, rule.id, token);
      setMessage(`Deleted "${rule.name}".`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard title="Create rule">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Assign new chats"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Trigger</label>
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className={selectClass}
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create rule'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </SettingsCard>

      <SettingsCard title="Rules">
        {rules.length === 0 ? (
          <div className="text-sm text-gray-500 space-y-2">
            <p>No automation rules yet.</p>
            <p className="text-xs text-gray-400">
              Lead Monitor / LeadSnapper synced contacts can trigger <code className="text-gray-600">contact.created</code>.
              Rules never auto-send marketing.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <li key={rule.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
                  <p className="text-xs text-gray-400">{rule.triggerEvent}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={rule.isEnabled}
                      onChange={() => toggleEnabled(rule)}
                    />
                    Enabled
                  </label>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(rule)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  );
}
