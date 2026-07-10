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
          Upload a CSV from Contacts, or send leads via API key (Settings → Integrations). Required columns:
          <strong> First Name</strong>, <strong>Last Name</strong>, and <strong>Email</strong> (or a single Name column).
          Optional: phone, type, Record ID / external_id, and custom attribute columns. Unmapped columns are ignored.
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

      <EcosystemProvisioningSection />
    </div>
  );
}

function EcosystemProvisioningSection() {
  const { token, accountId } = useAuthStore();
  const [lmEnabled, setLmEnabled] = useState(false);
  const [lmMinScore, setLmMinScore] = useState(0);
  const [waEnabled, setWaEnabled] = useState(false);
  const [lmOrgId, setLmOrgId] = useState('');
  const [waAccountId, setWaAccountId] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [waBaseUrl, setWaBaseUrl] = useState('https://www.digitalbrandcast.com/wa-automation');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const baseUrl = typeof window !== 'undefined' ? getApiUrl() : 'https://your-app.vercel.app/api';

  useEffect(() => {
    if (!token || !accountId) return;
    api.crm.ecosystem.get(accountId, token).then((r) => {
      setLmEnabled(r.leadmonitorSyncEnabled);
      setLmMinScore(r.leadmonitorMinScore);
      setWaEnabled(r.whatsappCrmSyncEnabled);
      const lm = r.integrations?.find((i) => i.integration_type === 'leadmonitor');
      const wa = r.integrations?.find((i) => i.integration_type === 'whatsapp_crm');
      if (lm?.external_id) setLmOrgId(lm.external_id);
      if (wa?.external_id) setWaAccountId(wa.external_id);
      const waSettings = (wa?.settings ?? {}) as Record<string, string>;
      if (waSettings.baseUrl) setWaBaseUrl(waSettings.baseUrl);
    }).catch(() => {});
  }, [token, accountId]);

  const save = async () => {
    if (!token || !accountId) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await api.crm.ecosystem.provision(
        accountId,
        {
          leadmonitorSyncEnabled: lmEnabled,
          leadmonitorMinScore: lmMinScore,
          whatsappCrmSyncEnabled: waEnabled,
          leadmonitorOrgId: lmOrgId.trim() || undefined,
          whatsappAccountId: waAccountId.trim() || undefined,
          whatsappApiKey: waApiKey.trim() || undefined,
          whatsappBaseUrl: waBaseUrl.trim() || undefined,
          provisionAttributes: true,
        },
        token
      );
      setMsg('Mutex ecosystem integration saved.');
      setWaApiKey('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Mutex ecosystem</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect Lead Monitor and WhatsApp CRM to FlowChat. Use sidebar links for SSO into child apps.
        </p>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" className={checkboxClass} checked={lmEnabled} onChange={(e) => setLmEnabled(e.target.checked)} />
        Enable Lead Monitor → FlowChat sync
      </label>
      <div>
        <label className={labelClass}>Minimum lead score</label>
        <Input type="number" min={0} max={100} value={lmMinScore} onChange={(e) => setLmMinScore(Number(e.target.value))} className="mt-1 max-w-xs" />
      </div>
      <div>
        <label className={labelClass}>Lead Monitor organization ID</label>
        <Input value={lmOrgId} onChange={(e) => setLmOrgId(e.target.value)} className="mt-1" placeholder="UUID from Lead Monitor settings" />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" className={checkboxClass} checked={waEnabled} onChange={(e) => setWaEnabled(e.target.checked)} />
        Enable FlowChat → WhatsApp CRM contact sync
      </label>
      <div>
        <label className={labelClass}>WhatsApp CRM account ID</label>
        <Input value={waAccountId} onChange={(e) => setWaAccountId(e.target.value)} className="mt-1" />
      </div>
      <div>
        <label className={labelClass}>WhatsApp API key (contacts:write)</label>
        <Input type="password" value={waApiKey} onChange={(e) => setWaApiKey(e.target.value)} className="mt-1" placeholder="Leave blank to keep existing" />
      </div>
      <div>
        <label className={labelClass}>WhatsApp base URL</label>
        <Input value={waBaseUrl} onChange={(e) => setWaBaseUrl(e.target.value)} className="mt-1" />
      </div>

      <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono space-y-1">
        <p className="font-sans text-gray-600 font-medium">Inbound Lead Monitor endpoint</p>
        <p>POST {baseUrl}/integrations/v1/leadmonitor/leads</p>
        <p className="font-sans text-gray-600 font-medium mt-2">WhatsApp webhook (register in Integrations)</p>
        <p>{waBaseUrl.replace(/\/$/, '')}/api/integrations/flowchat/webhook</p>
      </div>

      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save ecosystem settings'}
      </Button>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

function LeadSnapperProvisioningSection() {
  const { token, accountId } = useAuthStore();
  const [enabled, setEnabled] = useState(false);
  const [minPriority, setMinPriority] = useState<'Hot' | 'Warm' | 'all'>('all');
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
          <option value="all">All priorities (Hot, Warm, and Cold)</option>
          <option value="Warm">Hot + Warm only</option>
          <option value="Hot">Hot only</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Use <strong>All priorities</strong> to import every lead synced from LeadSnapper, including Cold and LinkedIn corporate captures.
        </p>
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
    {
      id: string;
      label: string;
      key: string;
      attrType: string;
      options: string[] | null;
      sortOrder: number;
      required: boolean;
    }[]
  >([]);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editRequired, setEditRequired] = useState(false);

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
        required: newRequired,
        sortOrder: definitions.length,
      },
      token
    );
    setNewLabel('');
    setNewOptions('');
    setNewRequired(false);
    setMsg('Attribute added.');
    load();
  };

  const remove = async (id: string) => {
    if (!token || !accountId || !confirm('Remove this attribute definition?')) return;
    await api.customAttributes.remove(accountId, id, token);
    load();
  };

  const startEdit = (d: (typeof definitions)[number]) => {
    setEditingId(d.id);
    setEditLabel(d.label);
    setEditOptions((d.options ?? []).join(', '));
    setEditRequired(d.required);
  };

  const saveEdit = async (id: string) => {
    if (!token || !accountId || !editLabel.trim()) return;
    const def = definitions.find((d) => d.id === id);
    await api.customAttributes.update(
      accountId,
      id,
      {
        label: editLabel.trim(),
        options: def?.attrType === 'select' ? editOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        required: editRequired,
      },
      token
    );
    setEditingId(null);
    load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!token || !accountId) return;
    const target = index + direction;
    if (target < 0 || target >= definitions.length) return;
    const a = definitions[index];
    const b = definitions[target];
    if (!a || !b) return;
    await Promise.all([
      api.customAttributes.update(accountId, a.id, { sortOrder: b.sortOrder }, token),
      api.customAttributes.update(accountId, b.id, { sortOrder: a.sortOrder }, token),
    ]);
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
        {definitions.map((d, i) => (
          <li key={d.id} className="border border-gray-100 rounded-lg p-2.5">
            {editingId === d.id ? (
              <div className="space-y-2">
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                />
                {d.attrType === 'select' && (
                  <input
                    value={editOptions}
                    onChange={(e) => setEditOptions(e.target.value)}
                    placeholder="Options, comma-separated"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  />
                )}
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />
                  Required
                </label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => void saveEdit(d.id)}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{d.label}</span>{' '}
                  <code className="text-gray-400 text-xs">{d.key}</code>{' '}
                  <span className="text-gray-400">({d.attrType})</span>
                  {d.required && <span className="ml-2 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Required</span>}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void move(i, -1)}
                    disabled={i === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(i, 1)}
                    disabled={i === definitions.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(d)}>
                    Edit
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => void remove(d.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            )}
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
        <label className="flex items-center gap-1.5 text-xs text-gray-600 pb-2">
          <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />
          Required
        </label>
        <Button type="submit">Add attribute</Button>
      </form>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
    </div>
  );
}
