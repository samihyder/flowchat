'use client';

import { useEffect, useState } from 'react';
import { api, type MarketingSender } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

export type WorkflowEmailDraft = {
  sendAt: string; // datetime-local value
  subject: string;
  htmlBody: string;
};

export type WorkflowFormData = {
  name: string;
  senderId: string;
  contactIds: string[];
  emails: WorkflowEmailDraft[];
};

type ContactOption = { id: string; name: string; email: string | null };

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSendAt(minutesFromNow: number): string {
  return toDatetimeLocal(new Date(Date.now() + minutesFromNow * 60_000).toISOString());
}

type Props = {
  accountId: string;
  token: string;
  initial?: Partial<WorkflowFormData> & { contacts?: ContactOption[] };
  submitLabel: string;
  busy: boolean;
  error?: string;
  onSubmit: (data: WorkflowFormData) => void;
  onCancel: () => void;
};

export function WorkflowForm({
  accountId,
  token,
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [senderId, setSenderId] = useState(initial?.senderId ?? '');
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [selected, setSelected] = useState<ContactOption[]>(initial?.contacts ?? []);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ContactOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [emails, setEmails] = useState<WorkflowEmailDraft[]>(
    initial?.emails?.length
      ? initial.emails
      : [{ sendAt: defaultSendAt(60), subject: '', htmlBody: '<p>Hi {{first_name}},</p><p></p>' }]
  );

  useEffect(() => {
    api.marketing.senders.list(accountId, token).then((r) => setSenders(r.senders));
  }, [accountId, token]);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api.contacts
        .list(accountId, token, { q, limit: 10 })
        .then((r) => setResults(r.contacts.map((c) => ({ id: c.id, name: c.name, email: c.email }))))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, accountId, token]);

  const addContact = (c: ContactOption) => {
    if (selected.some((s) => s.id === c.id)) return;
    setSelected((prev) => [...prev, c]);
  };

  const removeContact = (id: string) => {
    setSelected((prev) => prev.filter((c) => c.id !== id));
  };

  const updateEmail = (index: number, patch: Partial<WorkflowEmailDraft>) => {
    setEmails((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const addEmail = () => {
    const last = emails[emails.length - 1];
    const lastMinutes = last ? (new Date(last.sendAt).getTime() - Date.now()) / 60_000 : 60;
    setEmails((prev) => [
      ...prev,
      { sendAt: defaultSendAt(Math.max(60, lastMinutes + 1440)), subject: '', htmlBody: '<p></p>' },
    ]);
  };

  const removeEmail = (index: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      senderId,
      contactIds: selected.map((c) => c.id),
      emails,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-status-danger-bg border border-status-danger-text/20 text-status-danger-text text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Workflow name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. New lead nurture sequence"
            required
            className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary-border"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Sender</span>
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
          >
            <option value="">Default sender</option>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.fromEmail})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Contacts ({selected.length})</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts by name or email…"
          className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
        />
        {searching && <p className="text-xs text-gray-400">Searching…</p>}
        {results.length > 0 && (
          <ul className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {results.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {c.name} <span className="text-gray-400 text-xs">{c.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => addContact(c)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {selected.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 bg-primary-surface text-primary text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {c.name}
                <button type="button" onClick={() => removeContact(c.id)} aria-label={`Remove ${c.name}`}>
                  <MarketingIcon name="close" className="text-[14px]" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Email sequence ({emails.length})</h3>
        {emails.map((email, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Email {i + 1}</span>
              {emails.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEmail(i)}
                  className="text-xs text-status-danger-text hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-600">Send at</span>
              <input
                type="datetime-local"
                value={email.sendAt}
                onChange={(e) => updateEmail(i, { sendAt: e.target.value })}
                required
                className="border border-gray-200 rounded-lg text-sm px-3 py-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-600">Subject</span>
              <input
                value={email.subject}
                onChange={(e) => updateEmail(i, { subject: e.target.value })}
                placeholder="Subject — Hi {{first_name}}"
                required
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-600">Body (HTML, supports merge tags)</span>
              <textarea
                value={email.htmlBody}
                onChange={(e) => updateEmail(i, { htmlBody: e.target.value })}
                rows={5}
                required
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 font-mono"
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={addEmail}
          className="text-xs font-semibold text-primary hover:underline"
        >
          + Add follow-up email
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="marketing-btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
