'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fieldClass } from '@/components/ui/form-field';
import { documentTypeOptions } from '@/lib/das/labels';
import type { DasDocumentType } from '@/lib/das/types';
import { api, type Contact } from '@/lib/api';

type Props = {
  open: boolean;
  token: string;
  accountId: string;
  onClose: () => void;
  onCreate: (input: {
    type: DasDocumentType;
    title: string;
    contactId?: string | null;
  }) => Promise<void>;
};

export function DocumentCreateModal({
  open,
  token,
  accountId,
  onClose,
  onCreate,
}: Props) {
  const [type, setType] = useState<DasDocumentType>('quotation');
  const [title, setTitle] = useState('');
  const [contactQ, setContactQ] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setType('quotation');
    setTitle('');
    setContactQ('');
    setContactId('');
    setError('');
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  useEffect(() => {
    if (!open || !token || !accountId) return;
    const handle = window.setTimeout(() => {
      api.contacts
        .list(accountId, token, { q: contactQ.trim() || undefined, limit: 8 })
        .then((r) => setContacts(r.contacts))
        .catch(() => setContacts([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [open, token, accountId, contactQ]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onCreate({
        type,
        title: title.trim(),
        contactId: contactId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create document');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-fade-in"
      >
        <h2 className="text-lg font-semibold text-gray-900">New document</h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="doc-type" className="text-xs text-gray-500 block mb-1">
              Type
            </label>
            <select
              id="doc-type"
              className={fieldClass}
              value={type}
              onChange={(e) => setType(e.target.value as DasDocumentType)}
              disabled={saving}
            >
              {documentTypeOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="doc-title" className="text-xs text-gray-500 block mb-1">
              Title
            </label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 proposal for Acme"
              required
              autoFocus
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="doc-contact-q" className="text-xs text-gray-500 block mb-1">
              Link contact (optional)
            </label>
            <Input
              id="doc-contact-q"
              value={contactQ}
              onChange={(e) => setContactQ(e.target.value)}
              placeholder="Search contacts…"
              disabled={saving}
            />
            <select
              className={`${fieldClass} mt-2`}
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              disabled={saving}
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` · ${c.email}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || saving}>
            {saving ? 'Creating…' : 'Create draft'}
          </Button>
        </div>
      </form>
    </div>
  );
}
