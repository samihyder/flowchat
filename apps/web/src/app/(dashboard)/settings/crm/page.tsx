'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { checkboxClass, labelClass } from '@/components/ui/form-field';
import { getApiUrl } from '@/lib/config';

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
        setCrmImportEnabled(s.crmImportEnabled !== false);
        setCrmExportEnabled(s.crmExportEnabled !== false);
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
          Import contact lists (CSV), sync from LeadSnapper, or push via API. Administrators can import by default.
        </p>
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-gray-900">Import a contact list</h3>
        <p className="text-sm text-gray-600">
          Upload a CSV from Contacts, or send leads via API key (Settings → Integrations). Columns: name, email, phone,
          type, labels, and custom fields.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={'/dashboard/contacts' as Route}>
            <Button type="button">Go to Contacts → Import CSV</Button>
          </Link>
          <Link href={'/settings/integrations' as Route}>
            <Button type="button" variant="secondary">
              API keys & inbound sync
            </Button>
          </Link>
        </div>
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
          <p className="text-xs text-gray-500 pl-6">Off only if you want to block all imports. Admins can import when enabled.</p>

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

      <LeadSnapperProvisioningSection />
    </div>
  );
}

function LeadSnapperProvisioningSection() {
  const { token, accountId } = useAuthStore();
  const [enabled, setEnabled] = useState(false);
  const [minPriority, setMinPriority] = useState<'Hot' | 'Warm' | 'all'>('Warm');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const baseUrl = typeof window !== 'undefined' ? getApiUrl() : 'https://your-app.vercel.app/api';

  useEffect(() => {
    if (!token || !accountId) return;
    api.crm.leadsnapper.get(accountId, token).then((r) => {
      setEnabled(r.leadsnapperSyncEnabled);
      setMinPriority(r.leadsnapperMinPriority);
    }).catch(() => {});
  }, [token, accountId]);

  const save = async (provisionFields = false) => {
    if (!token || !accountId) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await api.crm.leadsnapper.provision(
        accountId,
        {
          leadsnapperSyncEnabled: enabled,
          leadsnapperMinPriority: minPriority,
          provisionAttributes: provisionFields,
        },
        token
      );
      const attrMsg = res.attributes
        ? ` Provisioned ${res.attributes.created} new + ${res.attributes.updated} updated contact fields.`
        : '';
      setMsg(`LeadSnapper provisioning saved.${attrMsg}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">LeadSnapper integration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Provision Flow CRM to receive qualified leads from the LeadSnapper Chrome extension.
          Create an API key under Settings → Integrations, then configure the extension to POST leads here.
        </p>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable LeadSnapper → CRM sync
      </label>

      <div>
        <label className={labelClass}>Minimum lead priority to import</label>
        <select
          value={minPriority}
          onChange={(e) => setMinPriority(e.target.value as 'Hot' | 'Warm' | 'all')}
          className="mt-1 block w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="Hot">Hot only</option>
          <option value="Warm">Hot + Warm (qualified)</option>
          <option value="all">All priorities</option>
        </select>
      </div>

      <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono space-y-2 overflow-x-auto">
        <p className="font-sans text-gray-600 font-medium">Inbound endpoint</p>
        <p>POST {baseUrl}/integrations/v1/leadsnapper/leads</p>
        <p>Authorization: Bearer fc_live_…</p>
        <pre className="text-[11px] whitespace-pre-wrap text-gray-700">{`{
  "source": "leadsnapper",
  "leads": [{
    "leadId": "uuid",
    "businessName": "Acme Ltd",
    "email": "info@acme.com",
    "phone": "+44 20 1234 5678",
    "website": "https://acme.com",
    "linkedinUrl": "https://linkedin.com/company/acme-ltd",
    "facebookUrl": "https://facebook.com/acme",
    "instagramUrl": "https://instagram.com/acme",
    "city": "London",
    "leadScore": 78,
    "leadPriority": "Hot",
    "targetMarket": "UK",
    "b2bSource": "UK: Companies House → Openmart → Cognism",
    "mobileSource": "Cognism",
    "companiesHouseMatched": true,
    "ownerName": "Jane Smith",
    "ownerPhone": "+44 7700 900123",
    "ownerMobile": "+44 7700 900123",
    "decisionMakerLinkedin": "https://linkedin.com/in/janesmith",
    "linkedinUrl": "https://linkedin.com/company/acme-ltd",
    "facebookUrl": "https://facebook.com/acme",
    "instagramUrl": "https://instagram.com/acme",
    "googleRating": 4.5,
    "hasChatWidget": false
  }]
}`}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} onClick={() => void save(false)}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void save(true)}>
          Save & provision contact fields
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        Provisioning creates custom contact fields for lead score, priority, website, business/owner phones and LinkedIn,
        social links, Google rating, chat widget, owner details, and enrichment sources (Companies House UK, Openmart, Cognism, Lusha).
        Dedupe uses LeadSnapper lead ID, email, or domain.
      </p>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
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
