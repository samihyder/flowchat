'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  api,
  type ContactDetail,
  type ContactNote,
  type CustomAttributeDefinition,
  type Label,
  type ContactEmailEvent,
  type MarketingTimelineEvent,
  type ServiceCredential,
  type EnrichmentSuggestion,
} from '@/lib/api';
import { ContactMarketingTimeline } from '@/components/marketing/contact-marketing-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomAttributeFields } from '@/components/contacts/custom-attribute-fields';
import { ContactQuickActionsPanel } from '@/components/contacts/contact-quick-actions-panel';
import { ContactCollapsible } from '@/components/contacts/contact-collapsible';
import { ContactWorkflowStrip } from '@/components/contacts/contact-workflow-strip';
import { MarketingStatusBadge } from '@/components/contacts/marketing-status-badge';
import { contactTypeBadgeClass, formatRelativeTime, initialsFromName } from '@/lib/format';
import { countryLabel, COUNTRY_OPTIONS } from '@/lib/country';

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
  const [editCountry, setEditCountry] = useState('');
  const [editType, setEditType] = useState<(typeof TYPES)[number]>('lead');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [emailEvents, setEmailEvents] = useState<ContactEmailEvent[]>([]);
  const [marketingTimeline, setMarketingTimeline] = useState<MarketingTimelineEvent[]>([]);
  const [enrichmentCreds, setEnrichmentCreds] = useState<ServiceCredential[]>([]);
  const [enrichCredentialId, setEnrichCredentialId] = useState('');
  const [enrichScope, setEnrichScope] = useState<'auto' | 'company' | 'person'>('auto');
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState('');
  const [enrichError, setEnrichError] = useState(false);
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([]);
  const [selectedFields, setSelectedFields] = useState<Record<string, Set<string>>>({});
  const [applyBusy, setApplyBusy] = useState(false);

  const load = async () => {
    if (!token || !accountId) return;
    const [res, labelRes, attrRes, access, eventsRes, timelineRes, enrichCredsRes, suggestionsRes] =
      await Promise.all([
        api.contacts.get(accountId, contactId, token),
        api.labels.list(accountId, token),
        api.customAttributes.list(accountId, token),
        api.contacts.access(accountId, token),
        api.contacts.listEmailEvents(accountId, contactId, token),
        api.contacts.getMarketingTimeline(accountId, contactId, token).catch(() => ({ events: [] })),
        api.serviceCredentials.list(accountId, token, 'data_enrichment'),
        api.contacts.listEnrichmentSuggestions(accountId, contactId, token),
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
    setEditCountry(res.contact.country ?? '');
    setEditType(res.contact.type);
    setSelectedLabelIds(res.labels.map((l) => l.id));
    setCustomAttributes((res.contact.customAttributes as Record<string, unknown>) ?? {});
    setEmailEvents(eventsRes.events);
    setMarketingTimeline(timelineRes.events);
    const activeEnrich = enrichCredsRes.credentials.filter((c) => c.status === 'active');
    setEnrichmentCreds(activeEnrich);
    const defaultEnrich = activeEnrich.find((c) => c.isDefault) ?? activeEnrich[0];
    setEnrichCredentialId((prev) => prev || defaultEnrich?.id || '');
    setSuggestions(suggestionsRes.suggestions);
    const initial: Record<string, Set<string>> = {};
    for (const s of suggestionsRes.suggestions) {
      initial[s.id] = new Set(s.fields.map((f) => f.key));
    }
    setSelectedFields(initial);
  };

  const runEnrichment = async () => {
    if (!token || !accountId || !enrichCredentialId) return;
    setEnrichBusy(true);
    setEnrichMsg('');
    setEnrichError(false);
    try {
      const res = await api.contacts.enrich(
        accountId,
        contactId,
        { credentialId: enrichCredentialId, scope: enrichScope },
        token
      );
      if (!res.ok) {
        setEnrichError(true);
        setEnrichMsg(res.error ?? 'Enrichment failed.');
        return;
      }
      setEnrichMsg(`Found ${res.fieldCount ?? 0} field(s) to review below.`);
      await load();
    } catch (err) {
      setEnrichError(true);
      setEnrichMsg(err instanceof Error ? err.message : 'Enrichment failed.');
    } finally {
      setEnrichBusy(false);
    }
  };

  const toggleField = (suggestionId: string, fieldKey: string) => {
    setSelectedFields((prev) => {
      const next = { ...prev };
      const set = new Set(next[suggestionId] ?? []);
      if (set.has(fieldKey)) set.delete(fieldKey);
      else set.add(fieldKey);
      next[suggestionId] = set;
      return next;
    });
  };

  const applySuggestion = async (suggestionId: string) => {
    if (!token || !accountId) return;
    const keys = [...(selectedFields[suggestionId] ?? [])];
    if (keys.length === 0) {
      setEnrichError(true);
      setEnrichMsg('Select at least one field to apply.');
      return;
    }
    setApplyBusy(true);
    setEnrichMsg('');
    setEnrichError(false);
    try {
      const res = await api.contacts.applyEnrichmentSuggestion(accountId, contactId, suggestionId, keys, token);
      setEnrichMsg(`Applied ${res.appliedCount} field(s).`);
      await load();
    } catch (err) {
      setEnrichError(true);
      setEnrichMsg(err instanceof Error ? err.message : 'Failed to apply fields.');
    } finally {
      setApplyBusy(false);
    }
  };

  const dismissSuggestion = async (suggestionId: string) => {
    if (!token || !accountId) return;
    await api.contacts.dismissEnrichmentSuggestion(accountId, contactId, suggestionId, token);
    await load();
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
          country: editCountry || null,
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

  const activityCount = conversations.length + notes.length + marketingTimeline.length;

  return (
    <div className="flex h-full min-h-0 animate-fade-in">
      <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
        <header className="shrink-0 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 px-6 py-5">
          <Link href={'/dashboard/contacts' as Route} className="text-xs font-medium text-primary-600 hover:underline">
            ← All contacts
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md shrink-0">
                {initialsFromName(contact.name)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{contact.name}</h1>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {contact.email ?? 'No email'}
                  {contact.phone ? ` · ${contact.phone}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${contactTypeBadgeClass(contact.type)}`}
                  >
                    {contact.type}
                  </span>
                  <MarketingStatusBadge status={contact.marketingStatus} />
                  {contact.country && (
                    <span className="text-xs text-gray-500">{countryLabel(contact.country)}</span>
                  )}
                  <span className="text-xs text-gray-400">Active {formatRelativeTime(contact.lastActivityAt)}</span>
                  {contact.isBlocked && <span className="text-xs text-red-600 font-medium">Blocked</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="xl:hidden"
                onClick={() => setMobileActionsOpen(true)}
              >
                ⚡ Actions
              </Button>
              {isAdmin && (
                <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete()}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-6 max-w-4xl">
            <ContactWorkflowStrip />

            <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/60 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Activity hub</p>
              <p className="text-sm text-gray-600 mt-1">
                {activityCount > 0
                  ? `${activityCount} touchpoint${activityCount === 1 ? '' : 's'} — conversations, marketing, and notes`
                  : 'Start engaging — open a chat, enroll in automation, or log a note from quick actions →'}
              </p>
            </div>

            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Conversations</h2>
                {conversations[0] && (
                  <Link
                    href={`/dashboard?conversation=${conversations[0].id}` as Route}
                    className="text-xs font-medium text-primary-600 hover:underline"
                  >
                    Open latest →
                  </Link>
                )}
              </div>
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-400">No conversations yet. Messages will appear here when this contact chats.</p>
              ) : (
                <ul className="space-y-2">
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard?conversation=${c.id}` as Route}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.inboxName}</p>
                          <p className="text-xs text-gray-500 capitalize">{c.status}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : 'No messages'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ContactMarketingTimeline events={marketingTimeline} />

            <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
              <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <Input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Log what happened with this contact…"
                  className="flex-1"
                />
                <Button type="submit">Add</Button>
              </form>
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="text-sm rounded-lg border border-gray-100 px-3 py-2.5">
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
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {n.authorName ?? 'Agent'} · {new Date(n.createdAt).toLocaleString()}
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

            <ContactCollapsible
              title="Edit contact"
              subtitle="Name, email, labels, and custom fields"
              badge="Profile"
            >
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" type="email" />
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
                  <select
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  >
                    <option value="">No country</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                        editType === t
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
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
                  </div>
                </div>
                {attrDefs.length > 0 && (
                  <CustomAttributeFields definitions={attrDefs} values={customAttributes} onChange={setCustomAttributes} />
                )}
                <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </ContactCollapsible>

            <ContactCollapsible
              title="Company & enrichment"
              subtitle={contact.company ? contact.company.name : 'Link company data and enrich profile'}
              badge={suggestions.length > 0 ? `${suggestions.length} pending` : undefined}
              defaultOpen={suggestions.length > 0}
            >
              <div className="space-y-4 pt-4">
                {contact.company ? (
                  <div className="text-sm space-y-1 rounded-lg bg-slate-50 border border-gray-100 p-3">
                    <p className="font-medium text-gray-900">{contact.company.name}</p>
                    <p className="text-gray-500">{contact.company.domain}</p>
                    {contact.company.website && (
                      <a
                        href={contact.company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:underline text-sm"
                      >
                        {contact.company.website}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No company linked. Use a corporate email domain to auto-link, or run enrichment.
                  </p>
                )}

                {enrichmentCreds.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Connect an enrichment provider in Settings → Connected services.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={enrichCredentialId}
                      onChange={(e) => setEnrichCredentialId(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    >
                      {enrichmentCreds.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={enrichScope}
                      onChange={(e) => setEnrichScope(e.target.value as 'auto' | 'company' | 'person')}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    >
                      <option value="auto">Auto</option>
                      <option value="company">Company</option>
                      <option value="person">Person</option>
                    </select>
                    <Button
                      type="button"
                      disabled={enrichBusy || !enrichCredentialId || !contact.email}
                      onClick={() => void runEnrichment()}
                    >
                      {enrichBusy ? 'Enriching…' : '✨ Enrich'}
                    </Button>
                  </div>
                )}
                {enrichMsg && (
                  <p
                    className={`text-sm rounded-lg px-3 py-2 border ${
                      enrichError ? 'text-red-800 bg-red-50 border-red-200' : 'text-green-800 bg-green-50 border-green-200'
                    }`}
                  >
                    {enrichMsg}
                  </p>
                )}

                {suggestions.map((s) => (
                  <div key={s.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-gray-800">
                      {s.providerLabel} · {s.fields.length} field(s)
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {s.fields.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedFields[s.id]?.has(f.key) ?? false}
                            onChange={() => toggleField(s.id, f.key)}
                          />
                          <span className="font-medium">{f.label}</span>
                          <span className="text-gray-400 truncate">{f.proposed}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" disabled={applyBusy} onClick={() => void applySuggestion(s.id)}>
                        Apply selected
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={applyBusy}
                        onClick={() => void dismissSuggestion(s.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ContactCollapsible>

            {emailEvents.length > 0 && (
              <ContactCollapsible title="Legacy email events" subtitle={`${emailEvents.length} events`}>
                <ul className="space-y-2 text-sm pt-4">
                  {emailEvents.map((e) => (
                    <li key={e.id} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                      <span>
                        <span className="font-medium capitalize">{e.eventType.replace(/_/g, ' ')}</span>
                        {e.subject && <span className="text-gray-500"> · {e.subject}</span>}
                      </span>
                      <span className="text-gray-400 shrink-0 text-xs">{new Date(e.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </ContactCollapsible>
            )}
          </div>
        </div>
      </div>

      {accountId && token && (
        <>
          <div className="hidden xl:flex w-[360px] shrink-0 min-h-0 border-l border-gray-200">
            <ContactQuickActionsPanel
              accountId={accountId}
              token={token}
              contactId={contactId}
              layout="dock"
              onContactUpdated={() => void load()}
            />
          </div>
          <div className="xl:hidden">
            <ContactQuickActionsPanel
              accountId={accountId}
              token={token}
              contactId={contactId}
              open={mobileActionsOpen}
              onClose={() => setMobileActionsOpen(false)}
              onContactUpdated={() => void load()}
            />
          </div>
        </>
      )}
    </div>
  );
}
