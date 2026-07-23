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
  type EmailAutomation,
  type ContactTask,
  type DasDocument,
} from '@/lib/api';
import { ContactMarketingTimeline } from '@/components/marketing/contact-marketing-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomAttributeFields } from '@/components/contacts/custom-attribute-fields';
import { ContactQuickActionsPanel } from '@/components/contacts/contact-quick-actions-panel';
import { MarketingStatusBadge } from '@/components/contacts/marketing-status-badge';
import { DocumentCreateModal } from '@/components/documents/document-create-modal';
import { DocumentListItem } from '@/components/documents/document-list-item';
import { contactTypeBadgeClass, formatRelativeTime, initialsFromName } from '@/lib/format';
import { countryLabel, COUNTRY_OPTIONS } from '@/lib/country';
import type { DasDocumentType } from '@/lib/das/types';

const TYPES = ['visitor', 'lead', 'customer'] as const;
const TABS = ['conversations', 'notes', 'documents', 'activity', 'automation'] as const;
type Tab = (typeof TABS)[number];

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

const roundAction =
  'group relative inline-flex items-center justify-center size-9 rounded-full border border-primary-200/80 bg-white text-primary-700 shadow-sm transition-all hover:bg-primary-600 hover:text-white hover:border-primary-600 hover:shadow-md disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-white disabled:hover:text-primary-700';

const TYPE_META: Record<(typeof TYPES)[number], { short: string; tone: string }> = {
  visitor: { short: 'V', tone: 'from-slate-400 to-slate-600' },
  lead: { short: 'L', tone: 'from-amber-400 to-orange-500' },
  customer: { short: 'C', tone: 'from-emerald-400 to-teal-600' },
};

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
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [enrolledAutomations, setEnrolledAutomations] = useState<Set<string>>(new Set());
  const [automationBusy, setAutomationBusy] = useState<string | null>(null);
  const [automationMsg, setAutomationMsg] = useState('');
  const [typeBusy, setTypeBusy] = useState(false);
  const [agents, setAgents] = useState<{ userId: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [assigneeSelect, setAssigneeSelect] = useState('');
  const [teamSelect, setTeamSelect] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskActionId, setTaskActionId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [editOpen, setEditOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enrichTargets, setEnrichTargets] = useState<{ key: string; label: string; group: string }[]>(
    []
  );
  const [requestedEnrichFields, setRequestedEnrichFields] = useState<Set<string>>(new Set());
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [contactDocs, setContactDocs] = useState<DasDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docCreateOpen, setDocCreateOpen] = useState(false);

  const load = async () => {
    if (!token || !accountId) return;
    const [
      res,
      labelRes,
      attrRes,
      access,
      eventsRes,
      timelineRes,
      enrichCredsRes,
      suggestionsRes,
      automationsRes,
      agentsRes,
      teamsRes,
      tasksRes,
    ] = await Promise.all([
      api.contacts.get(accountId, contactId, token),
      api.labels.list(accountId, token),
      api.customAttributes.list(accountId, token),
      api.contacts.access(accountId, token),
      api.contacts.listEmailEvents(accountId, contactId, token),
      api.contacts.getMarketingTimeline(accountId, contactId, token).catch(() => ({ events: [] })),
      api.serviceCredentials.list(accountId, token, 'data_enrichment'),
      api.contacts.listEnrichmentSuggestions(accountId, contactId, token),
      api.marketing.automations.list(accountId, token).catch(() => ({ automations: [] })),
      api.agents.list(accountId, token).catch(() => ({ agents: [] })),
      api.teams.list(accountId, token).catch(() => ({ teams: [] })),
      api.contacts.tasks.list(accountId, contactId, token).catch(() => ({ tasks: [] })),
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
    setAutomations(automationsRes.automations.filter((a) => a.enabled));
    setAgents(agentsRes.agents.map((a) => ({ userId: a.userId, name: a.displayName || a.name })));
    setTeams(teamsRes.teams);
    setTasks(tasksRes.tasks);
    setAssigneeSelect(res.contact.assigneeId ?? '');
    setTeamSelect(res.contact.teamId ?? '');
  };

  const loadContactDocs = async () => {
    if (!token || !accountId) return;
    setDocsLoading(true);
    try {
      const res = await api.das.documents.list(accountId, token, {
        contactId,
        limit: 50,
      });
      setContactDocs(res.documents);
    } catch {
      setContactDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const runEnrichment = async () => {
    if (!token || !accountId) return;
    if (requestedEnrichFields.size === 0) {
      setEnrichError(true);
      setEnrichMsg('Select at least one field to enrich.');
      return;
    }
    setEnrichBusy(true);
    setEnrichMsg('');
    setEnrichError(false);
    try {
      const res = await api.contacts.enrich(
        accountId,
        contactId,
        {
          useFlow: true,
          requestedFields: [...requestedEnrichFields],
        },
        token
      );
      if (!res.ok) {
        setEnrichError(true);
        setEnrichMsg(res.error ?? 'Enrichment failed.');
        return;
      }
      const count =
        res.suggestions?.reduce((n, s) => n + s.fieldCount, 0) ??
        res.fieldCount ??
        0;
      setEnrichMsg(
        res.flow
          ? `Ran enrichment sequence — ${count} field(s) to review below.`
          : `Found ${count} field(s) to review below.`
      );
      await load();
    } catch (err) {
      setEnrichError(true);
      setEnrichMsg(err instanceof Error ? err.message : 'Enrichment failed.');
    } finally {
      setEnrichBusy(false);
    }
  };

  const openEnrichModal = async () => {
    setEnrichOpen(true);
    if (!token || !accountId) return;
    try {
      const { manualTargets } = await api.enrichmentFlows.list(accountId, token);
      setEnrichTargets(manualTargets);
      setRequestedEnrichFields(
        new Set(
          manualTargets
            .filter((t) =>
              ['contact.email', 'contact.personalEmail', 'contact.phone'].includes(t.key)
            )
            .map((t) => t.key)
        )
      );
    } catch {
      setEnrichTargets([
        { key: 'contact.email', label: 'Corporate email', group: 'email' },
        { key: 'contact.personalEmail', label: 'Personal email', group: 'email' },
        { key: 'contact.phone', label: 'Mobile / WhatsApp', group: 'phone' },
      ]);
      setRequestedEnrichFields(new Set(['contact.email', 'contact.phone']));
    }
  };

  const toggleRequestedField = (key: string) => {
    setRequestedEnrichFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  useEffect(() => {
    if (activeTab === 'documents') {
      void loadContactDocs();
    }
  }, [activeTab, token, accountId, contactId]);

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
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTypeChange = async (type: (typeof TYPES)[number]) => {
    if (!token || !accountId || !contact || contact.type === type) return;
    setTypeBusy(true);
    try {
      await api.contacts.update(accountId, contactId, { type }, token);
      await load();
    } finally {
      setTypeBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!token || !accountId) return;
    setAssignBusy(true);
    try {
      await api.contacts.update(
        accountId,
        contactId,
        { assigneeId: assigneeSelect || null, teamId: teamSelect || null },
        token
      );
      await load();
    } finally {
      setAssignBusy(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !newTaskTitle.trim()) return;
    setTaskBusy(true);
    try {
      await api.contacts.tasks.create(
        accountId,
        contactId,
        // append a local noon time so the YYYY-MM-DD input value isn't parsed as UTC
        // midnight, which shifts the displayed due date back a day in negative-UTC zones
        { title: newTaskTitle.trim(), dueAt: newTaskDue ? new Date(`${newTaskDue}T12:00:00`).toISOString() : null },
        token
      );
      setNewTaskTitle('');
      setNewTaskDue('');
      await load();
    } finally {
      setTaskBusy(false);
    }
  };

  const handleToggleTask = async (task: ContactTask) => {
    if (!token || !accountId) return;
    setTaskActionId(task.id);
    try {
      await api.contacts.tasks.update(
        accountId,
        contactId,
        task.id,
        { status: task.status === 'open' ? 'done' : 'open' },
        token
      );
      await load();
    } finally {
      setTaskActionId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token || !accountId) return;
    setTaskActionId(taskId);
    try {
      await api.contacts.tasks.remove(accountId, contactId, taskId, token);
      await load();
    } finally {
      setTaskActionId(null);
    }
  };

  const handleEnrollAutomation = async (automationId: string) => {
    if (!token || !accountId) return;
    setAutomationBusy(automationId);
    setAutomationMsg('');
    try {
      const res = await api.marketing.automations.enroll(accountId, automationId, contactId, token);
      if (res.enrolled) {
        setEnrolledAutomations((prev) => new Set(prev).add(automationId));
      } else {
        setAutomationMsg(res.reason ?? 'Could not enroll in automation');
      }
    } finally {
      setAutomationBusy(null);
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
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
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
            <Button type="button" size="sm" onClick={() => setDocCreateOpen(true)}>
              New quotation
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              ✏ Edit
            </Button>
            {isAdmin && (
              <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete()}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* one horizontal facts strip replaces the old vertical rail / accordion clutter */}
      <div className="shrink-0 flex items-stretch bg-white border-b border-gray-200 overflow-x-auto">
        <Fact label="Company" value={contact.company?.name ?? '—'} />
        <Fact label="Created" value={new Date(contact.createdAt).toLocaleDateString()} />
        <Fact
          label="Labels"
          value={
            contact.labels.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {contact.labels.slice(0, 3).map((l) => (
                  <span
                    key={l.id}
                    className="text-[11px] px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
                {contact.labels.length > 3 && <span className="text-xs text-gray-400">+{contact.labels.length - 3}</span>}
              </span>
            ) : (
              <button type="button" onClick={() => setEditOpen(true)} className="text-xs text-primary-600 hover:underline">
                + Add
              </button>
            )
          }
        />
        <Fact
          label="Custom attributes"
          value={
            attrDefs.length > 0 ? (
              <button type="button" onClick={() => setEditOpen(true)} className="text-primary-600 hover:underline">
                {Object.keys(customAttributes).filter((k) => customAttributes[k] != null && customAttributes[k] !== '').length} set · Edit
              </button>
            ) : (
              '—'
            )
          }
        />
        <Fact
          label="Assigned to"
          value={
            contact.assigneeName || contact.teamName ? (
              [contact.assigneeName, contact.teamName].filter(Boolean).join(' · ')
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('automation')}
                className="text-xs text-primary-600 hover:underline"
              >
                Unassigned · Assign
              </button>
            )
          }
        />
      </div>

      {/* tabs replace the long vertical stack of always-rendered cards */}
      <div className="shrink-0 flex items-center gap-1 px-6 border-b border-gray-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              activeTab === t ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t === 'conversations' && `Conversations${conversations.length > 0 ? ` (${conversations.length})` : ''}`}
            {t === 'notes' && `Notes${notes.length > 0 ? ` (${notes.length})` : ''}`}
            {t === 'documents' && `Documents${contactDocs.length > 0 ? ` (${contactDocs.length})` : ''}`}
            {t === 'activity' && 'Activity'}
            {t === 'automation' && 'Automation'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 max-w-4xl">
          {activeTab === 'conversations' && (
            <section>
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
          )}

          {activeTab === 'notes' && (
            <section>
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
          )}

          {activeTab === 'documents' && (
            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Documents linked to this contact.
                  </p>
                  <Link
                    href={`/dashboard/documents?contactId=${encodeURIComponent(contactId)}` as Route}
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary-600 hover:underline"
                  >
                    Open in Documents module
                    <span className="material-symbols-outlined text-[14px]" aria-hidden>
                      open_in_new
                    </span>
                  </Link>
                </div>
                <Button type="button" size="sm" onClick={() => setDocCreateOpen(true)}>
                  + New quotation
                </Button>
              </div>
              {docsLoading ? (
                <p className="text-sm text-gray-400">Loading documents…</p>
              ) : contactDocs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
                  <p className="text-sm text-gray-400">No documents yet for this contact.</p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setDocCreateOpen(true)}
                  >
                    + New quotation
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {contactDocs.map((doc) => (
                    <DocumentListItem key={doc.id} document={doc} />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'activity' && (
            <section className="space-y-6">
              <ContactMarketingTimeline events={marketingTimeline} />
              {emailEvents.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Legacy email events</h2>
                  <ul className="space-y-2 text-sm">
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
                </div>
              )}
            </section>
          )}

          {activeTab === 'automation' && (
            <section className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[260px] bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">📧 Email sequences</h3>
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">Live</span>
                </div>
                {automationMsg && <p className="text-xs text-amber-700 mb-2">{automationMsg}</p>}
                {automations.length === 0 ? (
                  <p className="text-xs text-gray-400">No active email sequences configured.</p>
                ) : (
                  <ul className="space-y-2">
                    {automations.map((a) => {
                      const enrolled = enrolledAutomations.has(a.id);
                      return (
                        <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2">
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-gray-800 block truncate">{a.name}</span>
                            <span className="text-[10px] text-gray-400">{a.emailCount} emails</span>
                          </div>
                          <Button
                            type="button"
                            variant={enrolled ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={enrolled || automationBusy === a.id || !contact.email}
                            onClick={() => void handleEnrollAutomation(a.id)}
                          >
                            {enrolled ? '✓ Enrolled' : automationBusy === a.id ? '…' : 'Enroll'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex-1 min-w-[260px] bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">🧭 Routing &amp; assignment</h3>
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">Live</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="assign-assignee" className="text-[10px] uppercase tracking-wide text-gray-400 block mb-1">
                      Assignee
                    </label>
                    <select
                      id="assign-assignee"
                      value={assigneeSelect}
                      onChange={(e) => setAssigneeSelect(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a.userId} value={a.userId}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="assign-team" className="text-[10px] uppercase tracking-wide text-gray-400 block mb-1">
                      Team
                    </label>
                    <select
                      id="assign-team"
                      value={teamSelect}
                      onChange={(e) => setTeamSelect(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                    >
                      <option value="">No team</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" size="sm" disabled={assignBusy} onClick={() => void handleAssign()}>
                    {assignBusy ? 'Saving…' : 'Save assignment'}
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-w-[260px] bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">✅ Tasks</h3>
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">Live</span>
                </div>
                <form onSubmit={handleAddTask} className="flex flex-wrap gap-1.5 mb-2.5">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Follow up call…"
                    className="flex-1 min-w-[120px] text-xs"
                  />
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2"
                  />
                  <Button type="submit" size="sm" disabled={!newTaskTitle.trim() || taskBusy}>
                    +
                  </Button>
                </form>
                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-400">No tasks yet.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {tasks.map((t) => (
                      <li key={t.id} className="flex items-start gap-2 text-xs rounded-lg border border-gray-100 px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={t.status === 'done'}
                          disabled={taskActionId === t.id}
                          onChange={() => void handleToggleTask(t)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {t.title}
                          </p>
                          {t.dueAt && (
                            <p className="text-[10px] text-gray-400">Due {new Date(t.dueAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={taskActionId === t.id}
                          onClick={() => void handleDeleteTask(t.id)}
                          className="text-gray-300 hover:text-red-500 shrink-0"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex-1 min-w-[260px] bg-white border border-dashed border-gray-300 rounded-xl p-4 opacity-80">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">🎯 Trigger rules</h3>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">Coming soon</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Event-based automation (e.g. type changes → auto-enroll, inactive N days → notify) isn&apos;t
                  built. A similar 3-event trigger system existed in this codebase but was deliberately retired in
                  favor of campaign-based marketing — reviving or replacing it is a product decision, not wired up
                  here.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Quick actions — branded round controls, right-aligned */}
      <div className="shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-2.5 border-t border-primary-200/70 bg-gradient-to-r from-slate-50 via-primary-50/50 to-cyan-50/70">
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto overflow-x-auto max-w-full py-0.5">
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.12em] text-primary-700/70 shrink-0 pr-1">
            Quick actions
          </span>

          {conversations[0] && (
            <Link
              href={`/dashboard?conversation=${conversations[0].id}` as Route}
              className={roundAction}
              title="Open chat"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                forum
              </span>
              <span className="sr-only">Open chat</span>
            </Link>
          )}
          <a
            href={contact.email ? `mailto:${contact.email}` : undefined}
            className={`${roundAction} ${!contact.email ? 'opacity-40 pointer-events-none' : ''}`}
            title={contact.email ? `Email ${contact.email}` : 'No email'}
            aria-disabled={!contact.email}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              mail
            </span>
            <span className="sr-only">Email</span>
          </a>
          <a
            href={contact.phone ? `tel:${contact.phone}` : undefined}
            className={`${roundAction} ${!contact.phone ? 'opacity-40 pointer-events-none' : ''}`}
            title={contact.phone ? `Call ${contact.phone}` : 'No phone'}
            aria-disabled={!contact.phone}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              call
            </span>
            <span className="sr-only">Call</span>
          </a>
          <button
            type="button"
            className={roundAction}
            title="New document"
            onClick={() => setDocCreateOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              description
            </span>
            <span className="sr-only">New document</span>
          </button>

          <span className="w-px h-6 bg-primary-200/80 shrink-0 mx-0.5" aria-hidden />

          <div
            className="inline-flex items-center gap-1 rounded-full border border-primary-200/80 bg-white/90 p-0.5 shadow-sm"
            role="group"
            aria-label="Contact type"
          >
            {TYPES.map((t) => {
              const active = contact.type === t;
              const meta = TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  disabled={typeBusy || active}
                  onClick={() => void handleQuickTypeChange(t)}
                  title={t.charAt(0).toUpperCase() + t.slice(1)}
                  className={`size-8 rounded-full text-[11px] font-bold uppercase transition-all ${
                    active
                      ? `bg-gradient-to-br ${meta.tone} text-white shadow-sm ring-2 ring-white`
                      : 'text-primary-700/80 hover:bg-primary-50'
                  }`}
                >
                  {meta.short}
                </button>
              );
            })}
          </div>

          <span className="w-px h-6 bg-primary-200/80 shrink-0 mx-0.5" aria-hidden />

          <button
            type="button"
            className={`${roundAction} border-amber-200 text-amber-700 hover:bg-amber-500 hover:border-amber-500 hover:text-white`}
            title="Enrich contact"
            onClick={() => void openEnrichModal()}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              auto_awesome
            </span>
            <span className="sr-only">Enrich contact</span>
          </button>
          <button
            type="button"
            className={`${roundAction} bg-gradient-to-br from-primary-500 to-teal-600 text-white border-transparent hover:from-primary-600 hover:to-teal-700`}
            title="More actions"
            onClick={() => setMoreActionsOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              bolt
            </span>
            <span className="sr-only">More actions</span>
          </button>
        </div>
      </div>

      {editOpen && (
        <Modal title="Edit contact" onClose={() => setEditOpen(false)}>
          <div className="space-y-3">
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
        </Modal>
      )}

      {enrichOpen && (
        <Modal title="Enrich contact data" onClose={() => setEnrichOpen(false)} wide>
          <div className="space-y-4">
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
                {contact.email
                  ? 'No company linked yet — enrichment can still find phone and additional emails.'
                  : 'Lead Monitor contacts often have name + link only. Pick the fields you need below.'}
              </p>
            )}

            {enrichmentCreds.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Connect an enrichment provider in Settings → Connected services, then configure
                your sequence in Settings → Enrichment flows.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">
                    Which fields do you want from the enrichment sequence?
                  </p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-[28px_1fr_100px] gap-2 items-center bg-gray-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 border-b border-gray-200">
                      <span />
                      <span>Field</span>
                      <span>Group</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {enrichTargets.map((target) => (
                        <label
                          key={target.key}
                          className="grid grid-cols-[28px_1fr_100px] gap-2 items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={requestedEnrichFields.has(target.key)}
                            onChange={() => toggleRequestedField(target.key)}
                            className="size-4 rounded border-gray-300 text-primary-600"
                          />
                          <span className="text-sm text-gray-800">{target.label}</span>
                          <span className="text-xs text-gray-400 capitalize">{target.group}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Providers run in order from Settings → Enrichment flows (e.g. Lusha, then PDL).
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={enrichBusy || requestedEnrichFields.size === 0}
                  onClick={() => void runEnrichment()}
                >
                  {enrichBusy ? 'Running sequence…' : '✨ Run enrichment sequence'}
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
        </Modal>
      )}

      {accountId && token && (
        <div>
          <ContactQuickActionsPanel
            accountId={accountId}
            token={token}
            contactId={contactId}
            open={moreActionsOpen}
            onClose={() => setMoreActionsOpen(false)}
            onContactUpdated={() => void load()}
          />
        </div>
      )}

      {token && accountId && (
        <DocumentCreateModal
          open={docCreateOpen}
          token={token}
          accountId={accountId}
          onClose={() => setDocCreateOpen(false)}
          initialContactId={contactId}
          initialContactName={contact.name}
          lockContact
          defaultType="quotation"
          defaultTitle={`${contact.name} — Quotation`}
          onCreate={async (input) => {
            const res = await api.das.documents.create(
              accountId,
              {
                type: input.type as DasDocumentType,
                title: input.title,
                contactId: input.contactId ?? contactId,
                templateId: input.templateId,
              },
              token
            );
            setDocCreateOpen(false);
            router.push(`/dashboard/documents/${res.document.id}` as Route);
          }}
        />
      )}
    </div>
  );
}
