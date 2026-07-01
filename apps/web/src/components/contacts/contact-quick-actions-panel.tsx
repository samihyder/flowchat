'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { api, type ContactDetail, type MarketingCampaign, type MarketingSegment } from '@/lib/api';
import { countryLabel } from '@/lib/country';
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
};

const sectionTitle = 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5';

export function ContactQuickActionsPanel({ accountId, token, contactId, open, onClose }: Props) {
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

  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !contactId) return;
    setError('');
    setAddedSegments(new Set());
    setEnrolledCampaigns(new Set());
    setLoading(true);
    api.contacts
      .get(accountId, contactId, token)
      .then((r) => setContact({ ...r.contact, labels: r.labels ?? [], conversations: r.conversations ?? [], notes: r.notes ?? [] }))
      .catch(() => setContact(null))
      .finally(() => setLoading(false));
    api.marketing.segments
      .list(accountId, token)
      .then((r) => setSegments(r.segments.filter((s) => s.segmentType === 'static')))
      .catch(() => setSegments([]));
    api.marketing.campaigns
      .list(accountId, token, { status: 'draft' })
      .then((r) => setCampaigns(r.campaigns))
      .catch(() => setCampaigns([]));
  }, [open, contactId, accountId, token]);

  const handleAddToSegment = async (segmentId: string) => {
    if (!contactId) return;
    setSegmentBusy(segmentId);
    setError('');
    try {
      await api.marketing.segments.addMembers(accountId, segmentId, [contactId], token);
      setAddedSegments((prev) => new Set(prev).add(segmentId));
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
      const { segment } = await api.marketing.segments.create(accountId, { name, segmentType: 'static' }, token);
      await api.marketing.segments.addMembers(accountId, segment.id, [contactId], token);
      setSegments((prev) => [...prev, segment]);
      setAddedSegments((prev) => new Set(prev).add(segment.id));
      setNewSegmentName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create segment');
    } finally {
      setCreatingSegment(false);
    }
  };

  const handleEnroll = async (campaignId: string) => {
    if (!contactId) return;
    setCampaignBusy(campaignId);
    setError('');
    try {
      await api.marketing.campaigns.addContact(accountId, campaignId, contactId, token);
      setEnrolledCampaigns((prev) => new Set(prev).add(campaignId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll contact in campaign');
    } finally {
      setCampaignBusy(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl border-l border-gray-200 flex flex-col transition-transform duration-200 ease-out ${
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
                <h3 className={sectionTitle}>Core stats</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${contactTypeBadgeClass(contact.type)}`}
                  >
                    {contact.type}
                  </span>
                  {contact.country && <Badge color="gray">{countryLabel(contact.country)}</Badge>}
                  <MarketingStatusBadge status={contact.marketingStatus} />
                  {!contact.email && <Badge color="warning">No email</Badge>}
                  {!contact.phone && <Badge color="warning">No phone</Badge>}
                </div>
                {contact.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {contact.labels.map((l) => (
                      <span
                        key={l.id}
                        className="text-[11px] px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Last activity: {formatRelativeTime(contact.lastActivityAt)}
                </p>
              </section>

              {error && (
                <div className="mx-4 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <section className="p-4 border-b border-gray-200">
                <h3 className={sectionTitle}>Add to segment</h3>
                {segments.length === 0 ? (
                  <p className="text-xs text-gray-400 mb-3">No static segments yet.</p>
                ) : (
                  <ul className="space-y-1.5 mb-3">
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

              <section className="p-4">
                <h3 className={sectionTitle}>Add to campaign</h3>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-gray-400">No draft campaigns available.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {campaigns.map((c) => {
                      const enrolled = enrolledCampaigns.has(c.id);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">{c.name}</span>
                          <Button
                            type="button"
                            variant={enrolled ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={enrolled || campaignBusy === c.id}
                            onClick={() => void handleEnroll(c.id)}
                          >
                            {enrolled ? 'Enrolled' : campaignBusy === c.id ? 'Enrolling…' : 'Enroll'}
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
