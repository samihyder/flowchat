'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type ContactDetail, type ContactNote, type CustomAttributeDefinition, type Label, type ContactEmailEvent, type MarketingTimelineEvent, type ServiceCredential, type EnrichmentSuggestion } from '@/lib/api';
import { ContactMarketingTimeline } from '@/components/marketing/contact-marketing-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomAttributeFields } from '@/components/contacts/custom-attribute-fields';
import { ContactQuickActionsPanel } from '@/components/contacts/contact-quick-actions-panel';
import { ContactQuickActionBar } from '@/components/contacts/contact-quick-action-bar';
import { marketingRoutes } from '@/lib/marketing/routes';
import { COUNTRY_OPTIONS } from '@/lib/country';

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
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
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
  const [headerTypeBusy, setHeaderTypeBusy] = useState(false);
  const [headerCampaignBusy, setHeaderCampaignBusy] = useState(false);

  const load = async () => {
    if (!token || !accountId) return;
    const [res, labelRes, attrRes, access, eventsRes, timelineRes, enrichCredsRes, suggestionsRes] = await Promise.all([
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
      setEnrichMsg(
        `Found ${res.fieldCount ?? 0} field(s) to review. Select what to add below.`
      );
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
      const res = await api.contacts.applyEnrichmentSuggestion(
        accountId,
        contactId,
        suggestionId,
        keys,
        token
      );
      setEnrichMsg(`Applied ${res.appliedCount} field(s) to this contact.`);
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

  const handleQuickSetType = async (type: (typeof TYPES)[number]) => {
    if (!token || !accountId || contact?.type === type) return;
    setHeaderTypeBusy(true);
    try {
      await api.contacts.update(accountId, contactId, { type }, token);
      await load();
    } finally {
      setHeaderTypeBusy(false);
    }
  };

  const handleQuickCreateCampaign = async () => {
    if (!token || !accountId || !contact?.email) return;
    setHeaderCampaignBusy(true);
    try {
      const res = await api.marketing.campaigns.create(
        accountId,
        { name: `${contact.name} campaign` },
        token
      );
      await api.marketing.campaigns.addContact(accountId, res.campaign.id, contactId, token);
      router.push(marketingRoutes.campaignEdit(res.campaign.id, 1) as Route);
    } finally {
      setHeaderCampaignBusy(false);
    }
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
        <div className="flex items-center gap-2 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={() => setQuickActionsOpen(true)}>
            ⚡ Quick actions
          </Button>
          {isAdmin && (
            <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete()}>
              Delete contact
            </Button>
          )}
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <ContactQuickActionBar
          contact={{ ...contact, conversations }}
          onOpenPanel={() => setQuickActionsOpen(true)}
          onSetType={handleQuickSetType}
          onCreateCampaign={() => void handleQuickCreateCampaign()}
          typeBusy={headerTypeBusy}
          campaignBusy={headerCampaignBusy}
        />
      </div>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Details</h2>
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

        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Company & enrichment</h2>
          {contact.company ? (
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-900">{contact.company.name}</p>
              <p className="text-gray-500">{contact.company.domain}</p>
              {(contact.company.hqCity || contact.company.hqCountry) && (
                <p className="text-gray-500">
                  {[contact.company.hqCity, contact.company.hqCountry].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-xs text-gray-400 capitalize">
                Status: {contact.company.enrichmentStatus.replace(/_/g, ' ')}
              </p>
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
              No company linked. Save a corporate email (not Gmail, etc.) to auto-link a global company record.
            </p>
          )}

          {enrichmentCreds.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Add an enrichment API in Settings → Connected services to enrich this contact.
            </p>
          ) : (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">Run enrichment with a connected provider</p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={enrichCredentialId}
                  onChange={(e) => setEnrichCredentialId(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                >
                  {enrichmentCreds.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.provider})
                    </option>
                  ))}
                </select>
                <select
                  value={enrichScope}
                  onChange={(e) => setEnrichScope(e.target.value as 'auto' | 'company' | 'person')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                >
                  <option value="auto">Auto</option>
                  <option value="company">Company only</option>
                  <option value="person">Person only</option>
                </select>
                <Button
                  type="button"
                  disabled={enrichBusy || !enrichCredentialId || !contact.email}
                  onClick={() => void runEnrichment()}
                >
                  {enrichBusy ? 'Enriching…' : 'Enrich'}
                </Button>
              </div>
              {enrichMsg && (
                <p
                  className={`text-sm rounded-lg px-3 py-2 border ${
                    enrichError
                      ? 'text-red-800 bg-red-50 border-red-200'
                      : 'text-green-800 bg-green-50 border-green-200'
                  }`}
                >
                  {enrichMsg}
                </p>
              )}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-4 pt-3 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Review enrichment data</h3>
              <p className="text-xs text-gray-500">
                Choose which suggested values to add. Nothing is saved until you click Apply selected.
              </p>
              {suggestions.map((s) => (
                <div key={s.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">
                      {s.providerLabel} · {s.fields.length} field(s)
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.fetchedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="py-1 pr-2 w-8" />
                          <th className="py-1 pr-2">Field</th>
                          <th className="py-1 pr-2">Current</th>
                          <th className="py-1">Suggested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.fields.map((f) => (
                          <tr key={f.key} className="border-b border-gray-50">
                            <td className="py-2 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedFields[s.id]?.has(f.key) ?? false}
                                onChange={() => toggleField(s.id, f.key)}
                              />
                            </td>
                            <td className="py-2 pr-2 text-gray-700">{f.label}</td>
                            <td className="py-2 pr-2 text-gray-400">{f.current ?? '—'}</td>
                            <td className="py-2 text-gray-900">{f.proposed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={applyBusy}
                      onClick={() => void applySuggestion(s.id)}
                    >
                      {applyBusy ? 'Applying…' : 'Apply selected'}
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

        <ContactMarketingTimeline events={marketingTimeline} />

        {emailEvents.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Legacy email events</h2>
          <ul className="space-y-2 text-sm">
            {emailEvents.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <span>
                  <span className="font-medium capitalize">{e.eventType.replace(/_/g, ' ')}</span>
                  {e.subject && <span className="text-gray-500"> · {e.subject}</span>}
                  {e.campaignName && <span className="text-gray-400"> ({e.campaignName})</span>}
                </span>
                <span className="text-gray-400 shrink-0">{new Date(e.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
        )}

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
      {accountId && token && (
        <ContactQuickActionsPanel
          accountId={accountId}
          token={token}
          contactId={contactId}
          open={quickActionsOpen}
          onClose={() => setQuickActionsOpen(false)}
          onContactUpdated={() => void load()}
        />
      )}
    </div>
  );
}
