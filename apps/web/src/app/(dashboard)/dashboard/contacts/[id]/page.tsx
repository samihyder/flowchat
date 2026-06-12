'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type ContactDetail, type ContactNote } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ContactProfilePage() {
  const params = useParams();
  const contactId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [conversations, setConversations] = useState<ContactDetail['conversations']>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!token || !accountId) return;
    const res = await api.contacts.get(accountId, contactId, token);
    setContact({ ...res.contact, labels: res.labels } as ContactDetail);
    setNotes(res.notes);
    setConversations(res.conversations);
    setEditName(res.contact.name);
    setEditEmail(res.contact.email ?? '');
    setEditPhone(res.contact.phone ?? '');
  };

  useEffect(() => {
    load().catch(() => {});
  }, [token, accountId, contactId]);

  const handleSave = async () => {
    if (!token || !accountId) return;
    setSaving(true);
    try {
      await api.contacts.update(
        accountId,
        contactId,
        { name: editName, email: editEmail || null, phone: editPhone || null },
        token
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !noteDraft.trim()) return;
    await api.contacts.addNote(accountId, contactId, noteDraft.trim(), token);
    setNoteDraft('');
    await load();
  };

  if (!contact) {
    return <div className="p-8 text-sm text-gray-400">Loading contact…</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href={'/dashboard/contacts' as Route} className="text-sm text-primary-600 hover:underline">
          ← Contacts
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 mt-2">{contact.name}</h1>
        <p className="text-sm text-gray-500 capitalize">{contact.type}</p>
      </header>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Details</h2>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" type="email" />
          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {contact.labels?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {contact.labels.map((l) => (
                <span
                  key={l.id}
                  className="text-xs px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Conversations</h2>
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400">No conversations yet.</p>
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard?conversation=${c.id}` as Route}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    {c.inboxName} · {c.status}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : 'No messages'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <Input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note…"
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="text-sm border-b border-gray-100 pb-2">
                <p className="text-gray-800 whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.authorName ?? 'Agent'} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
            {notes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
          </ul>
        </section>
      </div>
    </div>
  );
}
