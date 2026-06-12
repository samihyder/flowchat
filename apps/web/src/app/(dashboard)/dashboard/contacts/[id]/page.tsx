'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type ContactDetail, type ContactNote, type CustomAttributeDefinition, type Label } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomAttributeFields } from '@/components/contacts/custom-attribute-fields';

const TYPES = ['visitor', 'lead', 'customer'] as const;

export default function ContactProfilePage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [conversations, setConversations] = useState<ContactDetail['conversations']>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [attrDefs, setAttrDefs] = useState<CustomAttributeDefinition[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editType, setEditType] = useState<(typeof TYPES)[number]>('lead');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const load = async () => {
    if (!token || !accountId) return;
    const [res, labelRes, attrRes, access] = await Promise.all([
      api.contacts.get(accountId, contactId, token),
      api.labels.list(accountId, token),
      api.customAttributes.list(accountId, token),
      api.contacts.access(accountId, token),
    ]);
    setContact({ ...res.contact, labels: res.labels } as ContactDetail);
    setNotes(res.notes);
    setConversations(res.conversations);
    setAllLabels(labelRes.labels);
    setAttrDefs(attrRes.definitions);
    setIsAdmin(access.isAdmin);
    setEditName(res.contact.name);
    setEditEmail(res.contact.email ?? '');
    setEditPhone(res.contact.phone ?? '');
    setEditType(res.contact.type);
    setSelectedLabelIds(res.labels.map((l) => l.id));
    setCustomAttributes((res.contact.customAttributes as Record<string, unknown>) ?? {});
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
        {
          name: editName,
          email: editEmail || null,
          phone: editPhone || null,
          type: editType,
          labelIds: selectedLabelIds,
          customAttributes,
        },
        token
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !accountId || !confirm('Delete this contact permanently?')) return;
    await api.contacts.remove(accountId, contactId, token);
    router.push('/dashboard/contacts' as Route);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !noteDraft.trim()) return;
    await api.contacts.addNote(accountId, contactId, noteDraft.trim(), token);
    setNoteDraft('');
    await load();
  };

  const saveNoteEdit = async (noteId: string) => {
    if (!token || !accountId || !editNoteContent.trim()) return;
    await api.contacts.updateNote(accountId, contactId, noteId, editNoteContent.trim(), token);
    setEditingNoteId(null);
    await load();
  };

  const deleteNote = async (noteId: string) => {
    if (!token || !accountId || !confirm('Delete this note?')) return;
    await api.contacts.deleteNote(accountId, contactId, noteId, token);
    await load();
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  if (!contact) {
    return <div className="p-8 text-sm text-gray-400">Loading contact…</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <Link href={'/dashboard/contacts' as Route} className="text-sm text-primary-600 hover:underline">
            ← Contacts
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 mt-2">{contact.name}</h1>
          <p className="text-sm text-gray-500 capitalize">
            {contact.type}
            {contact.isBlocked && ' · Blocked'}
            {contact.externalId && ` · External ID: ${contact.externalId}`}
          </p>
        </div>
        {isAdmin && (
          <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete()}>
            Delete contact
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Details</h2>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" type="email" />
          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value as (typeof TYPES)[number])}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          <div>
            <p className="text-xs text-gray-500 mb-2">Labels</p>
            <div className="flex flex-wrap gap-2">
              {allLabels.map((l) => {
                const active = selectedLabelIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      active ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'
                    }`}
                    style={active ? { backgroundColor: l.color } : undefined}
                  >
                    {l.name}
                  </button>
                );
              })}
              {allLabels.length === 0 && (
                <p className="text-xs text-gray-400">Create labels in Settings → Labels</p>
              )}
            </div>
          </div>

          <CustomAttributeFields
            definitions={attrDefs}
            values={customAttributes}
            onChange={setCustomAttributes}
          />

          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
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
                {editingNoteId === n.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg p-2"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => void saveNoteEdit(n.id)}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingNoteId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-800 whitespace-pre-wrap">{n.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">
                        {n.authorName ?? 'Agent'} · {new Date(n.createdAt).toLocaleString()}
                        {n.updatedAt !== n.createdAt && ' (edited)'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-primary-600 hover:underline"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setEditNoteContent(n.content);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => void deleteNote(n.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
            {notes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
          </ul>
        </section>
      </div>
    </div>
  );
}
