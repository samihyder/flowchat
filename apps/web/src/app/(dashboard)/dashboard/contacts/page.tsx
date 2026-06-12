'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Contact } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPES = ['', 'visitor', 'lead', 'customer'] as const;

export default function ContactsPage() {
  const { token, accountId } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({ canImport: false, canExport: false });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    try {
      const res = await api.contacts.list(accountId, token, {
        q: q || undefined,
        type: type || undefined,
        sort: 'last_activity_at',
        order: 'desc',
      });
      setContacts(res.contacts);
      setTotal(res.total);
    } catch {
      setContacts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, accountId, q, type]);

  useEffect(() => {
    if (!token || !accountId) return;
    api.contacts.access(accountId, token).then(setAccess).catch(() => {});
  }, [token, accountId]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleImport = async (file: File) => {
    if (!token || !accountId) return;
    setImporting(true);
    setImportResult('');
    try {
      const res = await api.contacts.importCsv(accountId, file, token);
      setImportResult(`Imported ${res.imported}, skipped ${res.skipped}.`);
      await load();
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    if (!token || !accountId) return;
    try {
      const blob = await api.contacts.exportCsv(accountId, token, { q: q || undefined, type: type || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowchat-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : 'Export failed');
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

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Contacts"
        description={`${total} contact${total === 1 ? '' : 's'} in your CRM`}
        action={
          <div className="flex flex-wrap gap-2">
            {access.canImport && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImport(f);
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="secondary" disabled={importing} onClick={() => fileRef.current?.click()}>
                  {importing ? 'Importing…' : 'Import CSV'}
                </Button>
              </>
            )}
            {access.canExport && (
              <Button type="button" variant="secondary" onClick={() => void handleExport()}>
                Export CSV
              </Button>
            )}
            <Button type="button" onClick={() => setShowCreate(!showCreate)}>
              Add contact
            </Button>
          </div>
        }
      />

      <div className="px-6 pb-4 flex flex-wrap gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone…"
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
        {importResult && <p className="text-sm text-gray-600 self-center">{importResult}</p>}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mx-6 mb-4 p-4 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-3 items-end">
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/contacts/${c.id}` as Route}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
