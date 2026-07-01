'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  api,
  type ContactDetail,
  type EmailAutomation,
  type MarketingCampaign,
  type MarketingSegment,
  type ServiceCredential,
} from '@/lib/api';
import { countryLabel } from '@/lib/country';
import { marketingRoutes } from '@/lib/marketing/routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contactTypeBadgeClass, formatRelativeTime, initialsFromName } from '@/lib/format';
import { MarketingStatusBadge } from '@/components/contacts/marketing-status-badge';

type Props = {
  accountId: string;
  token: string;
  contactId: string | null;
  open: boolean;
  onClose: () => void;
  onContactUpdated?: () => void;
};

const sectionTitle = 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5';
const CONTACT_TYPES = ['visitor', 'lead', 'customer'] as const;

function QuickLink({
  href,
  external,
  onClick,
  children,
  disabled,
}: {
  href?: string;
  external?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const className =
    'flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-50 hover:border-primary-200 transition-colors disabled:opacity-50 disabled:pointer-events-none';

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href as Route} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ContactQuickActionsPanel({
  accountId,
  token,
  contactId,
  open,
  onClose,
  onContactUpdated,
}: Props) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [addedSegments, setAddedSegments] = useState<Set<string>>(new Set());
  const [segmentBusy, setSegmentBusy] = useState<string | null>(null);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [creatingSegment, setCreatingSegment] = useState(false);

  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [enrolledCampaigns, setEnrolledCampaigns] = useState<Set<string>>(new Set());
  const [campaignBusy, setCampaignBusy] = useState<string | null>(null);

  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [enrolledAutomations, setEnrolledAutomations] = useState<Set<string>>(new Set());
  const [automationBusy, setAutomationBusy] = useState<string | null>(null);

  const [enrichmentCreds, setEnrichmentCreds] = useState<ServiceCredential[]>([]);
  const [enrichBusy, setEnrichBusy] = useState(false);

  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [typeBusy, setTypeBusy] = useState(false);
  const [campaignCreateBusy, setCampaignCreateBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const reloadContact = async () => {
    if (!contactId) return;
    const r = await api.contacts.get(accountId, contactId, token);
    setContact({
      ...r.contact,
      labels: r.labels ?? [],
      conversations: r.conversations ?? [],
      notes: r.notes ?? [],
    });
  };

  useEffect(() => {
    if (!open || !contactId) return;
    setError('');
    setSuccess('');
    setCopied(null);
    setAddedSegments(new Set());
    setEnrolledCampaigns(new Set());
    setEnrolledAutomations(new Set());
    setNoteDraft('');
    setLoading(true);

    Promise.all([
      reloadContact().catch(() => setContact(null)),
      api.marketing.segments
        .list(accountId, token)
        .then((r) => setSegments(r.segments.filter((s) => s.segmentType === 'static')))
        .catch(() => setSegments([])),
      api.marketing.campaigns
        .list(accountId, token, { status: 'draft' })
        .then((r) => setCampaigns(r.campaigns))
        .catch(() => setCampaigns([])),
      api.marketing.automations
        .list(accountId, token)
        .then((r) => setAutomations(r.automations.filter((a) => a.enabled)))
        .catch(() => setAutomations([])),
      api.serviceCredentials
        .list(accountId, token, 'data_enrichment')
        .then((r) => setEnrichmentCreds(r.credentials.filter((c) => c.status === 'active')))
        .catch(() => setEnrichmentCreds([])),
    ]).finally(() => setLoading(false));
  }, [open, contactId, accountId, token]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setError('');
    window.setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddToSegment = async (segmentId: string) => {
    if (!contactId) return;
    setSegmentBusy(segmentId);
    setError('');
    try {
      await api.marketing.segments.addMembers(accountId, segmentId, [contactId], token);
      setAddedSegments((prev) => new Set(prev).add(segmentId));
      flash('Added to segment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add contact to segment');
    } finally {
      setSegmentBusy(null);
    }
  };

  const handleCreateSegment = async () => {
    const name = newSegmentName.trim();
    if (!name || !contactId) return;
    setCreatingSegment(true);
    setError('');
    try {
      const { segment } = await api.marketing.segments.create(
        accountId,
        { name, segmentType: 'static' },
        token
      );
      await api.marketing.segments.addMembers(accountId, segment.id, [contactId], token);
      setSegments((prev) => [...prev, segment]);
      setAddedSegments((prev) => new Set(prev).add(segment.id));
      setNewSegmentName('');
      flash('Segment created and contact added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create segment');
    } finally {
      setCreatingSegment(false);
    }
  };

  const handleEnrollCampaign = async (campaignId: string) => {
    if (!contactId) return;
    setCampaignBusy(campaignId);
    setError('');
    try {
      await api.marketing.campaigns.addContact(accountId, campaignId, contactId, token);
      setEnrolledCampaigns((prev) => new Set(prev).add(campaignId));
      flash('Added to campaign');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll contact in campaign');
    } finally {
      setCampaignBusy(null);
    }
  };

  const handleEnrollAutomation = async (automationId: string) => {
    if (!contactId) return;
    setAutomationBusy(automationId);
    setError('');
    try {
      await api.marketing.automations.enroll(accountId, automationId, contactId, token);
      setEnrolledAutomations((prev) => new Set(prev).add(automationId));
      flash('Enrolled in automation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll in automation');
    } finally {
      setAutomationBusy(null);
    }
  };

  const handleCreateCampaign = async () => {
    if (!contactId || !contact) return;
    setCampaignCreateBusy(true);
    setError('');
    try {
      const res = await api.marketing.campaigns.create(
        accountId,
        { name: `${contact.name} campaign` },
        token
      );
      await api.marketing.campaigns.addContact(accountId, res.campaign.id, contactId, token);
      onClose();
      router.push(marketingRoutes.campaignEdit(res.campaign.id, 1) as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create campaign');
    } finally {
      setCampaignCreateBusy(false);
    }
  };

  const handleSetType = async (type: (typeof CONTACT_TYPES)[number]) => {
    if (!contactId || contact?.type === type) return;
    setTypeBusy(true);
    setError('');
    try {
      await api.contacts.update(accountId, contactId, { type }, token);
      await reloadContact();
      onContactUpdated?.();
      flash(`Marked as ${type}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update type');
    } finally {
      setTypeBusy(false);
    }
  };

  const handleAddNote = async () => {
    if (!contactId || !noteDraft.trim()) return;
    setNoteBusy(true);
    setError('');
    try {
      await api.contacts.addNote(accountId, contactId, noteDraft.trim(), token);
      setNoteDraft('');
      onContactUpdated?.();
      flash('Note added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add note');
    } finally {
      setNoteBusy(false);
    }
  };

  const handleEnrich = async () => {
    if (!contactId || !enrichmentCreds[0]) return;
    setEnrichBusy(true);
    setError('');
    try {
      const cred = enrichmentCreds.find((c) => c.isDefault) ?? enrichmentCreds[0];
      const res = await api.contacts.enrich(
        accountId,
        contactId,
        { credentialId: cred.id, scope: 'auto' },
        token
      );
      if (!res.ok) {
        setError(res.error ?? 'Enrichment failed');
        return;
      }
      onContactUpdated?.();
      flash(`Enrichment ready — ${res.fieldCount ?? 0} field(s) to review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnrichBusy(false);
    }
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(`Could not copy ${label}`);
    }
  };

  const latestConversation = contact?.conversations?.[0];

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Quick actions</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-400">Loading…</div>
          ) : !contact ? (
            <div className="p-4 text-sm text-gray-400">Contact not found.</div>
          ) : (
            <>
              <section className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {initialsFromName(contact.name)}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/contacts/${contact.id}` as Route}
                      className="font-medium text-gray-900 hover:text-primary-600 block truncate"
                    >
                      {contact.name}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">{contact.email ?? 'No email'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${contactTypeBadgeClass(contact.type)}`}
                  >
                    {contact.type}
                  </span>
                  {contact.country && <Badge color="gray">{countryLabel(contact.country)}</Badge>}
                  <MarketingStatusBadge status={contact.marketingStatus} />
                  {!contact.email && <Badge color="warning">No email</Badge>}
                </div>
                <p className="text-xs text-gray-500">
                  Last activity: {formatRelativeTime(contact.lastActivityAt)}
                </p>
              </section>

              {success && (
                <div className="mx-4 mt-3 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {success}
                </div>
              )}
              {error && (
                <div className="mx-4 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <section className="p-4 border-b border-gray-200 space-y-2">
                <h3 className={sectionTitle}>Navigate & reach out</h3>
                <div className="grid grid-cols-1 gap-2">
                  {latestConversation ? (
                    <QuickLink
                      href={`/dashboard?conversation=${latestConversation.id}`}
                      onClick={onClose}
                    >
                      <span>💬</span>
                      <span>Open latest conversation · {latestConversation.inboxName}</span>
                    </QuickLink>
                  ) : (
                    <QuickLink disabled>
                      <span>💬</span>
                      <span className="text-gray-400">No conversations yet</span>
                    </QuickLink>
                  )}
                  <QuickLink
                    href={contact.email ? `mailto:${contact.email}` : undefined}
                    external
                    disabled={!contact.email}
                  >
                    <span>✉️</span>
                    <span>{contact.email ? `Email ${contact.email}` : 'No email address'}</span>
                  </QuickLink>
                  <QuickLink
                    href={contact.phone ? `tel:${contact.phone}` : undefined}
                    disabled={!contact.phone}
                  >
                    <span>📞</span>
                    <span>{contact.phone ? `Call ${contact.phone}` : 'No phone number'}</span>
                  </QuickLink>
                  <div className="grid grid-cols-2 gap-2">
                    <QuickLink
                      onClick={() => contact.email && void copyText('email', contact.email)}
                      disabled={!contact.email}
                    >
                      <span>📋</span>
                      <span>{copied === 'email' ? 'Copied!' : 'Copy email'}</span>
                    </QuickLink>
                    <QuickLink
                      onClick={() => contact.phone && void copyText('phone', contact.phone)}
                      disabled={!contact.phone}
                    >
                      <span>📋</span>
                      <span>{copied === 'phone' ? 'Copied!' : 'Copy phone'}</span>
                    </QuickLink>
                  </div>
                </div>
              </section>

              <section className="p-4 border-b border-gray-200">
                <h3 className={sectionTitle}>CRM tasks</h3>
                <p className="text-xs text-gray-500 mb-2">Set contact type</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CONTACT_TYPES.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={contact.type === t ? 'primary' : 'secondary'}
                      disabled={typeBusy || contact.type === t}
                      onClick={() => void handleSetType(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">Quick note</p>
                <div className="flex gap-2">
                  <Input
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note…"
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!noteDraft.trim() || noteBusy}
                    onClick={() => void handleAddNote()}
                  >
                    {noteBusy ? '…' : 'Add'}
                  </Button>
                </div>
              </section>

              {enrichmentCreds.length > 0 && contact.email && (
                <section className="p-4 border-b border-gray-200">
                  <h3 className={sectionTitle}>Enrichment</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={enrichBusy}
                    onClick={() => void handleEnrich()}
                  >
                    {enrichBusy ? 'Enriching…' : 'Run enrichment'}
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">
                    Review suggested fields on the contact profile after enrichment.
                  </p>
                </section>
              )}

              <section className="p-4 border-b border-gray-200">
                <h3 className={sectionTitle}>Marketing shortcuts</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <QuickLink href={marketingRoutes.campaigns} onClick={onClose}>
                    <span>📧</span>
                    <span>Campaigns</span>
                  </QuickLink>
                  <QuickLink href={marketingRoutes.segments} onClick={onClose}>
                    <span>👥</span>
                    <span>Segments</span>
                  </QuickLink>
                </div>
                <Button
                  type="button"
                  className="w-full mb-4"
                  disabled={campaignCreateBusy || !contact.email}
                  onClick={() => void handleCreateCampaign()}
                >
                  {campaignCreateBusy ? 'Creating…' : 'New campaign with this contact'}
                </Button>
                {!contact.email && (
                  <p className="text-xs text-amber-700 mb-3">Email required for campaigns.</p>
                )}
              </section>

              <section className="p-4 border-b border-gray-200">
                <h3 className={sectionTitle}>Add to segment</h3>
                {segments.length === 0 ? (
                  <p className="text-xs text-gray-400 mb-3">No static segments yet.</p>
                ) : (
                  <ul className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                    {segments.map((s) => {
                      const added = addedSegments.has(s.id);
                      return (
                        <li key={s.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">{s.name}</span>
                          <Button
                            type="button"
                            variant={added ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={added || segmentBusy === s.id}
                            onClick={() => void handleAddToSegment(s.id)}
                          >
                            {added ? 'Added' : segmentBusy === s.id ? 'Adding…' : 'Add'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newSegmentName}
                    onChange={(e) => setNewSegmentName(e.target.value)}
                    placeholder="+ New segment name"
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!newSegmentName.trim() || creatingSegment}
                    onClick={() => void handleCreateSegment()}
                  >
                    {creatingSegment ? 'Creating…' : 'Create'}
                  </Button>
                </div>
              </section>

              <section className="p-4 border-b border-gray-200">
                <h3 className={sectionTitle}>Add to draft campaign</h3>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-gray-400">No draft campaigns available.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                    {campaigns.map((c) => {
                      const enrolled = enrolledCampaigns.has(c.id);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">{c.name}</span>
                          <Button
                            type="button"
                            variant={enrolled ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={enrolled || campaignBusy === c.id || !contact.email}
                            onClick={() => void handleEnrollCampaign(c.id)}
                          >
                            {enrolled ? 'Added' : campaignBusy === c.id ? 'Adding…' : 'Add'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="p-4">
                <h3 className={sectionTitle}>Enroll in automation</h3>
                {automations.length === 0 ? (
                  <p className="text-xs text-gray-400">No active automations.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {automations.map((a) => {
                      const enrolled = enrolledAutomations.has(a.id);
                      return (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs text-gray-700 block truncate">{a.name}</span>
                            <span className="text-[10px] text-gray-400">
                              {a.emailCount} email{a.emailCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant={enrolled ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={enrolled || automationBusy === a.id || !contact.email}
                            onClick={() => void handleEnrollAutomation(a.id)}
                          >
                            {enrolled ? 'Enrolled' : automationBusy === a.id ? '…' : 'Enroll'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
