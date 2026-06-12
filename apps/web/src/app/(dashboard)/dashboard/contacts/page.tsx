'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Contact, type Label } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactImportModal } from '@/components/contacts/contact-import-modal';
import { ContactMergeModal } from '@/components/contacts/contact-merge-modal';
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

export default function ContactsPage() {
  const { token, accountId } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [labelId, setLabelId] = useState('');
  const [sortKey, setSortKey] = useState('last_activity_at:desc');
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({ canImport: false, canExport: false, isAdmin: false });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [customAttrKeys, setCustomAttrKeys] = useState<{ key: string; label: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [sort, order] = sortKey.split(':') as [string, string];

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    try {
      const res = await api.contacts.list(accountId, token, {
        q: q || undefined,
        type: type || undefined,
        labelId: labelId || undefined,
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
  }, [token, accountId, q, type, labelId, sort, order, page]);

  useEffect(() => {
    if (!token || !accountId) return;
    api.contacts.access(accountId, token).then(setAccess).catch(() => {});
    api.labels.list(accountId, token).then((r) => setLabels(r.labels)).catch(() => {});
    api.customAttributes
      .list(accountId, token)
      .then((r) => setCustomAttrKeys(r.definitions.map((d) => ({ key: d.key, label: d.label }))))
      .catch(() => {});
  }, [token, accountId]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [q, type, labelId, sortKey]);

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
    const { job } = await api.contacts.startImportJob(accountId, file, token, {
      columnMapping,
      upsertByEmail,
    });
    setImportStatus(`Import started (${job.totalRows} rows)…`);
    const poll = async () => {
      const res = await api.contacts.pollImportJob(accountId, job.id, token);
      const j = res.job;
      if (!res.done) {
        setImportStatus(
          `Importing… ${j.processedRows ?? 0}/${j.totalRows} (${j.importedCount ?? 0} imported, ${j.skippedCount ?? 0} skipped)`
        );
        setTimeout(poll, 1500);
        return;
      }
      setImportStatus(
        `Done: ${j.importedCount ?? 0} imported, ${j.skippedCount ?? 0} skipped.${(j.errors?.length ?? 0) > 0 ? ` ${j.errors!.length} errors — download from import status.` : ''}`
      );
      await load();
    };
    void poll();
  };

  const handleExport = async () => {
    if (!token || !accountId) return;
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
      setImportStatus(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !newName.trim()) return;
    await api.contacts.create(accountId, { name: newName.trim(), email: newEmail || null, type: 'lead' }, token);
    setNewName('');
    setNewEmail('');
    setShowCreate(false);
    await load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Contacts"
        description={`${total} contact${total === 1 ? '' : 's'} in your CRM`}
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
            <Button type="button" onClick={() => setShowCreate(!showCreate)}>
              Add contact
            </Button>
          </div>
        }
      />

      <div className="px-6 pb-4 flex flex-wrap gap-3 items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, external ID…"
          className="max-w-xs"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          {TYPES.map((t) => (
            <option key={t || 'all'} value={t}>
              {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All types'}
            </option>
          ))}
        </select>
        <select
          value={labelId}
          onChange={(e) => setLabelId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {importStatus && <p className="text-sm text-gray-600">{importStatus}</p>}
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mx-6 mb-4 p-4 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="text-xs text-gray-500">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-gray-500">Email</label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <Button type="submit">Save</Button>
        </form>
      )}

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selected.size === contacts.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Labels</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/contacts/${c.id}` as Route}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.isBlocked && (
                        <span className="ml-2 text-xs text-red-500">Blocked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{c.type}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.labels ?? []).map((l) => (
                          <span
                            key={l.id}
                            className="text-xs px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: l.color }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
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
        )}
      </div>

      <ContactImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportJob}
        customAttrKeys={customAttrKeys}
      />
      <ContactMergeModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMerged={() => void load()}
      />
    </div>
  );
}
