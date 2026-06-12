'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { checkboxClass, labelClass } from '@/components/ui/form-field';

type AgentOption = { userId: string; name: string; email: string; role: string };

export default function CrmSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [crmImportEnabled, setCrmImportEnabled] = useState(false);
  const [crmExportEnabled, setCrmExportEnabled] = useState(false);
  const [importUserIds, setImportUserIds] = useState<string[]>([]);
  const [exportUserIds, setExportUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.account.get(accountId, token),
      api.agents.list(accountId, token),
      api.contacts.access(accountId, token),
    ])
      .then(([account, agentRes, access]) => {
        setIsAdmin(access.isAdmin);
        const s = account.account.settings ?? {};
        setCrmImportEnabled(s.crmImportEnabled ?? false);
        setCrmExportEnabled(s.crmExportEnabled ?? false);
        setImportUserIds(s.crmImportAllowedUserIds ?? []);
        setExportUserIds(s.crmExportAllowedUserIds ?? []);
        setAgents(
          agentRes.agents
            .filter((a) => a.membershipStatus === 'active')
            .map((a) => ({ userId: a.userId, name: a.name, email: a.email, role: a.role }))
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [token, accountId]);

  const toggleUser = (list: string[], userId: string, checked: boolean) => {
    if (checked) return [...list, userId];
    return list.filter((id) => id !== userId);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !isAdmin) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.account.update(
        accountId,
        {
          settings: {
            crmImportEnabled,
            crmExportEnabled,
            crmImportAllowedUserIds: importUserIds,
            crmExportAllowedUserIds: exportUserIds,
          },
        },
        token
      );
      setMessage('CRM settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-gray-500">Only administrators can configure CRM import/export.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">CRM — Import & export</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enable CSV import/export and choose which agents may use each feature. Administrators always have access when enabled.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-5 space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={crmImportEnabled}
              onChange={(e) => setCrmImportEnabled(e.target.checked)}
            />
            Enable contact import (CSV)
          </label>

          {crmImportEnabled && (
            <div className="pl-6 space-y-2">
              <p className={labelClass}>Agents allowed to import</p>
              {agents
                .filter((a) => a.role !== 'administrator')
                .map((a) => (
                  <label key={a.userId} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={importUserIds.includes(a.userId)}
                      onChange={(e) => setImportUserIds(toggleUser(importUserIds, a.userId, e.target.checked))}
                    />
                    {a.name} ({a.email})
                  </label>
                ))}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={crmExportEnabled}
              onChange={(e) => setCrmExportEnabled(e.target.checked)}
            />
            Enable contact export (CSV)
          </label>

          {crmExportEnabled && (
            <div className="pl-6 space-y-2">
              <p className={labelClass}>Agents allowed to export</p>
              {agents
                .filter((a) => a.role !== 'administrator')
                .map((a) => (
                  <label key={a.userId} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={exportUserIds.includes(a.userId)}
                      onChange={(e) => setExportUserIds(toggleUser(exportUserIds, a.userId, e.target.checked))}
                    />
                    {a.name} ({a.email})
                  </label>
                ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          CSV supports name, email, phone, type, external_id, labels, and custom attribute columns.
        </p>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save CRM settings'}
        </Button>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <CustomAttributesSection />
    </div>
  );
}

function CustomAttributesSection() {
  const { token, accountId } = useAuthStore();
  const [definitions, setDefinitions] = useState<
    { id: string; label: string; key: string; attrType: string; options: string[] | null }[]
  >([]);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [newOptions, setNewOptions] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    if (!token || !accountId) return;
    api.customAttributes.list(accountId, token).then((r) => setDefinitions(r.definitions)).catch(() => {});
  };

  useEffect(load, [token, accountId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !newLabel.trim()) return;
    await api.customAttributes.create(
      accountId,
      {
        label: newLabel.trim(),
        attrType: newType,
        options: newType === 'select' ? newOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      },
      token
    );
    setNewLabel('');
    setNewOptions('');
    setMsg('Attribute added.');
    load();
  };

  const remove = async (id: string) => {
    if (!token || !accountId || !confirm('Remove this attribute definition?')) return;
    await api.customAttributes.remove(accountId, id, token);
    load();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Custom contact attributes</h2>
        <p className="text-sm text-gray-500 mt-1">
          Define extra fields shown on contact profiles and available in CSV import/export.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        {definitions.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2">
            <span>
              <span className="font-medium">{d.label}</span>{' '}
              <code className="text-gray-400 text-xs">{d.key}</code>{' '}
              <span className="text-gray-400">({d.attrType})</span>
            </span>
            <Button type="button" variant="danger" size="sm" onClick={() => void remove(d.id)}>
              Remove
            </Button>
          </li>
        ))}
        {definitions.length === 0 && <p className="text-gray-400">No custom attributes yet.</p>}
      </ul>
      <form onSubmit={add} className="flex flex-wrap gap-2 items-end pt-2 border-t border-gray-100">
        <div>
          <label className="text-xs text-gray-500">Label</label>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="block mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="Company size"
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="block mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Select</option>
            <option value="boolean">Yes/No</option>
          </select>
        </div>
        {newType === 'select' && (
          <div>
            <label className="text-xs text-gray-500">Options (comma-separated)</label>
            <input
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              className="block mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="Small, Medium, Enterprise"
            />
          </div>
        )}
        <Button type="submit">Add attribute</Button>
      </form>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
    </div>
  );
}
