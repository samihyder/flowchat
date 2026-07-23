'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuthStore } from '@/store/auth';
import { api, type Contact, type DasClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fieldClass } from '@/components/ui/form-field';

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  contactId: string;
};

const emptyForm = (): ClientForm => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  notes: '',
  contactId: '',
});

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function DocumentsClientsPage() {
  const { token, accountId } = useAuthStore();
  const [clients, setClients] = useState<DasClient[]>([]);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactQ, setContactQ] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [q]);

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.clients.list(accountId, token, {
        q: debouncedQ || undefined,
      });
      setClients(res.clients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [token, accountId, debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const handle = window.setTimeout(() => setMsg(''), 2200);
    return () => window.clearTimeout(handle);
  }, [msg]);

  useEffect(() => {
    if (!token || !accountId || !showForm) return;
    const handle = window.setTimeout(() => {
      api.contacts
        .list(accountId, token, { q: contactQ.trim() || undefined, limit: 8 })
        .then((r) => setContacts(r.contacts))
        .catch(() => setContacts([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [token, accountId, contactQ, showForm]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setContactQ('');
    setShowForm(true);
  };

  const startEdit = (c: DasClient) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      company: c.company ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
      contactId: c.contactId ?? '',
    });
    setContactQ('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token || !accountId || !form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        contactId: form.contactId || null,
      };
      if (editingId) {
        const res = await api.das.clients.update(accountId, editingId, body, token);
        setClients((prev) =>
          prev.map((c) => (c.id === editingId ? res.client : c))
        );
        setMsg('Client updated');
      } else {
        const res = await api.das.clients.create(accountId, body, token);
        setClients((prev) =>
          [...prev, res.client].sort((a, b) => a.name.localeCompare(b.name))
        );
        setMsg('Client created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !accountId) return;
    if (!window.confirm('Delete this client?')) return;
    setError('');
    try {
      await api.das.clients.delete(accountId, id, token);
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) {
        setShowForm(false);
        setEditingId(null);
      }
      setMsg('Client deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Clients"
        description="Optional document parties — link to Flow CRM contacts when available"
        action={
          <Button type="button" onClick={startCreate}>
            + New client
          </Button>
        }
      />

      <div className="mx-6 mt-4 mb-3 flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto shrink-0">
        <Fact label="Clients" value={loading ? '—' : clients.length} />
      </div>

      {(error || msg) && (
        <div
          className={`mx-6 mb-3 text-sm rounded-lg px-4 py-3 border shrink-0 ${
            error
              ? 'text-red-800 bg-red-50 border-red-200'
              : 'text-primary-900 bg-primary-50 border-primary-200'
          }`}
        >
          {error || msg}
        </div>
      )}

      <div className="mx-6 mb-3 shrink-0">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients…"
          className="max-w-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6 space-y-6">
        {showForm && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {editingId ? 'Edit client' : 'New client'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Company</label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea
                  className={`${fieldClass} min-h-[80px]`}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Link Flow CRM contact (optional)
                </label>
                <Input
                  value={contactQ}
                  onChange={(e) => setContactQ(e.target.value)}
                  placeholder="Search contacts…"
                />
                <select
                  className={fieldClass}
                  value={form.contactId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactId: e.target.value }))
                  }
                >
                  <option value="">No contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` · ${c.email}` : ''}
                    </option>
                  ))}
                  {form.contactId &&
                    !contacts.some((c) => c.id === form.contactId) && (
                      <option value={form.contactId}>Linked contact</option>
                    )}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create client'}
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Clients
            </h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">
                {debouncedQ ? 'No clients match your search.' : 'No clients yet.'}
              </p>
              {!debouncedQ && (
                <Button type="button" className="mt-4" onClick={startCreate}>
                  + New client
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clients.map((c) => (
                <li
                  key={c.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-primary-50/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(c.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {[c.company, c.email, c.phone].filter(Boolean).join(' · ') ||
                        'No details'}
                    </p>
                    {c.contactId ? (
                      <Link
                        href={`/dashboard/contacts/${c.contactId}` as Route}
                        className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-primary-600 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[13px]" aria-hidden>
                          person
                        </span>
                        Open CRM contact
                      </Link>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(c)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(c.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
