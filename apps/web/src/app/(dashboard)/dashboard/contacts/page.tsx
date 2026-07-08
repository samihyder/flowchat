'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Contact, type Label, type EmailAutomation } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactImportModal, type ImportProgress } from '@/components/contacts/contact-import-modal';
import { ContactMergeModal } from '@/components/contacts/contact-merge-modal';
import { ContactCreateModal } from '@/components/contacts/contact-create-modal';
import { ContactListItem } from '@/components/contacts/contact-list-item';
import { COUNTRY_OPTIONS } from '@/lib/country';
import type { ColumnMapping } from '@/lib/csv-import-utils';

const TYPES = ['', 'visitor', 'lead', 'customer'] as const;
const SORTS = [
  { value: 'last_activity_at:desc', label: 'Last activity ↓' },
  { value: 'last_activity_at:asc', label: 'Last activity ↑' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
] as const;

const PAGE_SIZE = 50;

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function ContactsPage() {
  const { token, accountId } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [labelId, setLabelId] = useState('');
  const [marketingStatus, setMarketingStatus] = useState('');
  const [country, setCountry] = useState('');
  const [hasAutomation, setHasAutomation] = useState('');
  const [sortKey, setSortKey] = useState('last_activity_at:desc');
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({ canImport: false, canExport: false, isAdmin: false, importEnabled: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [customAttrKeys, setCustomAttrKeys] = useState<{ key: string; label: string }[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState(0);
  const [stats, setStats] = useState({ hasEmail: 0, hasPhone: 0, inAutomation: 0, newThisWeek: 0 });
  const [bulkLabelId, setBulkLabelId] = useState('');
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [agents, setAgents] = useState<{ userId: string; name: string }[]>([]);
  const [bulkAutomationId, setBulkAutomationId] = useState('');
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [bulkAutomateBusy, setBulkAutomateBusy] = useState(false);
  const [bulkAssignBusy, setBulkAssignBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [exportError, setExportError] = useState('');
  const importCancelledRef = useRef(false);

  useEffect(() => {
    if (!token || !accountId || !access.isAdmin) return;
    api.contacts
      .listDuplicates(accountId, token)
      .then((r) => setDuplicateGroups(r.groups.length))
      .catch(() => setDuplicateGroups(0));
  }, [token, accountId, access.isAdmin, mergeOpen]);

  const loadStats = useCallback(() => {
    if (!token || !accountId) return;
    api.contacts
      .getStats(accountId, token)
      .then((r) =>
        setStats({
          hasEmail: r.stats.hasEmail,
          hasPhone: r.stats.hasPhone,
          inAutomation: r.stats.inAutomation,
          newThisWeek: r.stats.newThisWeek,
        })
      )
      .catch(() => setStats({ hasEmail: 0, hasPhone: 0, inAutomation: 0, newThisWeek: 0 }));
  }, [token, accountId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const [sort, order] = sortKey.split(':') as [string, string];

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    try {
      const res = await api.contacts.list(accountId, token, {
        q: q || undefined,
        type: type || undefined,
        labelId: labelId || undefined,
        marketingStatus: marketingStatus || undefined,
        country: country || undefined,
        hasAutomation: hasAutomation || undefined,
        sort,
        order,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setContacts(res.contacts);
      setTotal(res.total);
    } catch {
      setContacts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, accountId, q, type, labelId, marketingStatus, country, hasAutomation, sort, order, page]);

  useEffect(() => {
    if (!token || !accountId) return;
    api.contacts.access(accountId, token).then(setAccess).catch(() => {});
    api.labels.list(accountId, token).then((r) => setLabels(r.labels)).catch(() => {});
    api.customAttributes
      .list(accountId, token)
      .then((r) => setCustomAttrKeys(r.definitions.map((d) => ({ key: d.key, label: d.label }))))
      .catch(() => {});
    api.marketing.automations
      .list(accountId, token)
      .then((r) => setAutomations(r.automations.filter((a) => a.enabled)))
      .catch(() => setAutomations([]));
    api.agents
      .list(accountId, token)
      .then((r) => setAgents(r.agents.map((a) => ({ userId: a.userId, name: a.displayName || a.name }))))
      .catch(() => setAgents([]));
  }, [token, accountId]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [q, type, labelId, marketingStatus, country, hasAutomation, sortKey]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  const handleImportJob = async (file: File, columnMapping: ColumnMapping, upsertByEmail: boolean) => {
    if (!token || !accountId) return;
    importCancelledRef.current = false;
    const { job } = await api.contacts.startImportJob(accountId, file, token, {
      columnMapping,
      upsertByEmail,
    });
    if (importCancelledRef.current) return;
    setImportProgress({
      totalRows: job.totalRows,
      processedRows: 0,
      importedCount: 0,
      skippedCount: 0,
      errors: [],
      done: false,
    });
    const poll = async () => {
      if (importCancelledRef.current) return;
      const res = await api.contacts.pollImportJob(accountId, job.id, token);
      if (importCancelledRef.current) return;
      const j = res.job;
      setImportProgress({
        totalRows: j.totalRows ?? job.totalRows,
        processedRows: j.processedRows ?? 0,
        importedCount: j.importedCount ?? 0,
        skippedCount: j.skippedCount ?? 0,
        errors: j.errors ?? [],
        done: res.done,
      });
      if (!res.done) {
        setTimeout(poll, 1500);
        return;
      }
      await load();
      loadStats();
    };
    void poll();
  };

  const handleExport = async () => {
    if (!token || !accountId) return;
    setExportError('');
    try {
      const ids = selected.size > 0 ? [...selected] : undefined;
      const blob = await api.contacts.exportCsv(accountId, token, {
        q: ids ? undefined : q || undefined,
        type: ids ? undefined : type || undefined,
        labelId: ids ? undefined : labelId || undefined,
        ids,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowchat-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleCreate = async (name: string, email: string) => {
    if (!token || !accountId) return;
    await api.contacts.create(accountId, { name, email: email || null, type: 'lead' }, token);
    await load();
    loadStats();
  };

  const handleBulkDelete = async () => {
    if (!token || !accountId || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} contact(s)? This cannot be undone.`)) return;
    for (const id of selected) {
      await api.contacts.remove(accountId, id, token).catch(() => {});
    }
    setSelected(new Set());
    await load();
    loadStats();
  };

  const handleBulkLabel = async () => {
    if (!token || !accountId || selected.size === 0 || !bulkLabelId) return;
    const label = labels.find((l) => l.id === bulkLabelId);
    if (!label) return;
    for (const id of selected) {
      const c = contacts.find((x) => x.id === id);
      const existing = c?.labels?.map((l) => l.id) ?? [];
      if (existing.includes(label.id)) continue;
      await api.contacts
        .update(accountId, id, { labelIds: [...existing, label.id] }, token)
        .catch(() => {});
    }
    setSelected(new Set());
    setBulkLabelId('');
    await load();
  };

  const handleBulkAutomate = async () => {
    if (!token || !accountId || selected.size === 0 || !bulkAutomationId) return;
    setBulkAutomateBusy(true);
    setBulkMsg('');
    try {
      const res = await api.marketing.automations.bulkEnroll(accountId, bulkAutomationId, [...selected], token);
      setBulkMsg(`Enrolled ${res.enrolledCount} of ${selected.size} contact(s) in automation.`);
      setSelected(new Set());
      setBulkAutomationId('');
    } catch (err) {
      setBulkMsg(err instanceof Error ? err.message : 'Bulk enrollment failed');
    } finally {
      setBulkAutomateBusy(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!token || !accountId || selected.size === 0 || !bulkAssigneeId) return;
    setBulkAssignBusy(true);
    setBulkMsg('');
    try {
      const res = await api.contacts.bulkAssign(accountId, { contactIds: [...selected], assigneeId: bulkAssigneeId }, token);
      setBulkMsg(`Assigned ${res.updatedCount} of ${selected.size} contact(s).`);
      setSelected(new Set());
      setBulkAssigneeId('');
      await load();
    } catch (err) {
      setBulkMsg(err instanceof Error ? err.message : 'Bulk assignment failed');
    } finally {
      setBulkAssignBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Contacts"
        description={
          loading
            ? 'Engage leads, run automations, and grow relationships'
            : `${total} contact${total === 1 ? '' : 's'}${stats.newThisWeek > 0 ? ` · ${stats.newThisWeek} new this week` : ''}`
        }
        action={
          <div className="flex flex-wrap gap-2">
            {access.isAdmin && (
              <Button type="button" variant="secondary" onClick={() => setMergeOpen(true)}>
                Merge duplicates
              </Button>
            )}
            {access.canImport && (
              <Button type="button" variant="secondary" onClick={() => setImportOpen(true)}>
                Import CSV
              </Button>
            )}
            {access.canExport && (
              <Button type="button" variant="secondary" onClick={() => void handleExport()}>
                Export{selected.size > 0 ? ` (${selected.size})` : ''}
              </Button>
            )}
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + New contact
            </Button>
          </div>
        }
      />

      {/* one horizontal facts strip replaces the old workflow-strip + 2x4 metric grid */}
      <div className="mx-6 mt-4 mb-3 flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto shrink-0">
        <Fact label="Total contacts" value={loading ? '—' : total} />
        <Fact label="Reachable email" value={stats.hasEmail} />
        <Fact label="Has phone" value={stats.hasPhone} />
        <Fact label="In automation" value={stats.inAutomation} />
        <Fact
          label="Duplicates"
          value={
            duplicateGroups > 0 ? (
              <button
                type="button"
                onClick={() => setMergeOpen(true)}
                className="text-amber-700 hover:underline"
              >
                {duplicateGroups} group{duplicateGroups === 1 ? '' : 's'} →
              </button>
            ) : (
              <span className="text-gray-400">All clear</span>
            )
          }
        />
      </div>

      {access.isAdmin && !access.canImport && (
        <div className="mx-6 mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Contact import is turned off.{' '}
          <Link href={'/settings/crm' as Route} className="font-medium underline">
            Enable it in Settings → CRM
          </Link>
          .
        </div>
      )}

      {exportError && (
        <div className="mx-6 mb-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Export failed: {exportError}
        </div>
      )}

      {selected.size > 0 && (
        <div className="mx-6 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="text-sm text-primary-900 font-medium">{selected.size} selected</span>
          <button type="button" onClick={toggleAll} className="text-xs text-primary-600 hover:underline">
            {selected.size === contacts.length ? 'Clear' : 'Select page'}
          </button>
          {bulkMsg && <span className="text-xs text-primary-800">{bulkMsg}</span>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={bulkLabelId}
              onChange={(e) => setBulkLabelId(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Apply label…</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <Button type="button" variant="secondary" size="sm" disabled={!bulkLabelId} onClick={() => void handleBulkLabel()}>
              Apply
            </Button>
            <select
              value={bulkAutomationId}
              onChange={(e) => setBulkAutomationId(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">⚡ Enroll in automation…</option>
              {automations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!bulkAutomationId || bulkAutomateBusy}
              onClick={() => void handleBulkAutomate()}
            >
              {bulkAutomateBusy ? 'Enrolling…' : 'Enroll'}
            </Button>
            <select
              value={bulkAssigneeId}
              onChange={(e) => setBulkAssigneeId(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">🧭 Assign to…</option>
              {agents.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!bulkAssigneeId || bulkAssignBusy}
              onClick={() => void handleBulkAssign()}
            >
              {bulkAssignBusy ? 'Assigning…' : 'Assign'}
            </Button>
            {access.isAdmin && (
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleBulkDelete()}>
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0 mx-6 mb-6 gap-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="shrink-0 p-3 border-b border-gray-100 bg-slate-50/80">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search contacts…"
                className="flex-1 min-w-[140px]"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              >
                {TYPES.map((t) => (
                  <option key={t || 'all'} value={t}>
                    {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All types'}
                  </option>
                ))}
              </select>
              <select
                value={marketingStatus}
                onChange={(e) => setMarketingStatus(e.target.value)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Subscription</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="pending">Pending</option>
                <option value="bounced">Bounced</option>
              </select>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white max-w-[120px]"
              >
                <option value="">Country</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              >
                <option value="">All labels</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <select
                value={hasAutomation}
                onChange={(e) => setHasAutomation(e.target.value)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Automation</option>
                <option value="yes">In automation</option>
                <option value="no">No automation</option>
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="ml-auto px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contacts.length > 0 && selected.size === contacts.length}
                onChange={toggleAll}
              />
              Select all
            </label>
            <span>
              {loading ? 'Loading…' : `${rangeStart}–${rangeEnd} of ${total}`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <p className="p-8 text-center text-sm text-gray-400">Loading contacts…</p>
            ) : contacts.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">No contacts match your filters.</p>
            ) : (
              contacts.map((c) => (
                <ContactListItem
                  key={c.id}
                  contact={c}
                  bulkSelected={selected.has(c.id)}
                  onBulkToggle={() => toggleSelect(c.id)}
                />
              ))
            )}
          </div>

          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <Button type="button" variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ContactCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <ContactImportModal
        open={importOpen}
        onClose={() => {
          importCancelledRef.current = true;
          setImportOpen(false);
          setImportProgress(null);
        }}
        onImport={handleImportJob}
        progress={importProgress}
        customAttrKeys={customAttrKeys}
      />
      <ContactMergeModal open={mergeOpen} onClose={() => setMergeOpen(false)} onMerged={() => void load()} />
    </div>
  );
}
