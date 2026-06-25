'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CampaignRecipientDetail, type Contact, type MarketingSegment } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { initials } from '@/components/conversations/conversation-badges';

type Props = {
  accountId: string;
  campaignId: string;
  token: string;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onSummaryChange?: (summary: { selected: number; suppressed: number }) => void;
  onImportComplete?: (recipients: CampaignRecipientDetail[]) => void;
  lastPutResult?: CampaignRecipientDetail[] | null;
  totalContactsAvailable?: number;
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-purple-100 text-purple-600',
  'bg-orange-100 text-orange-600',
  'bg-gray-100 text-gray-600',
  'bg-green-100 text-green-600',
];

function recipientStatusForContact(
  contact: Contact,
  putById: Map<string, CampaignRecipientDetail>
): CampaignRecipientDetail['recipientStatus'] {
  const fromPut = putById.get(contact.id);
  if (fromPut) return fromPut.recipientStatus;
  if (!contact.email?.trim()) return 'no_email';
  if (contact.marketingStatus && contact.marketingStatus !== 'subscribed') return 'suppressed';
  return 'subscribed';
}

function statusBadge(status: CampaignRecipientDetail['recipientStatus']) {
  if (status === 'suppressed') {
    return (
      <span className="px-2.5 py-1 bg-status-danger-bg text-status-danger-text text-xs font-bold rounded-full">
        Suppressed
      </span>
    );
  }
  if (status === 'no_email') {
    return (
      <span className="px-2.5 py-1 bg-status-draft-bg text-status-draft-text text-xs font-bold rounded-full">
        No email
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 bg-status-success-bg text-status-success-text text-xs font-bold rounded-full">
      Subscribed
    </span>
  );
}

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash]!;
}

export function CampaignRecipientsStep({
  accountId,
  campaignId,
  token,
  selectedIds,
  onSelectedIdsChange,
  onSummaryChange,
  onImportComplete,
  lastPutResult,
  totalContactsAvailable,
}: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [segmentId, setSegmentId] = useState('');
  const [search, setSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [page, setPage] = useState(0);

  const putById = useMemo(() => {
    const map = new Map<string, CampaignRecipientDetail>();
    for (const r of lastPutResult ?? []) {
      map.set(r.contactId, r);
    }
    return map;
  }, [lastPutResult]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await api.contacts.list(accountId, token, {
        q: search || undefined,
        limit: 50,
      });
      setContacts(res.contacts);
    } finally {
      setLoadingContacts(false);
    }
  }, [accountId, token, search]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    api.marketing.segments.list(accountId, token).then((r) => setSegments(r.segments));
  }, [accountId, token]);

  const toggleContact = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange(next);
  };

  const toggleAllShown = () => {
    const allSelected = contacts.every((c) => selectedIds.has(c.id));
    if (allSelected) {
      const next = new Set(selectedIds);
      contacts.forEach((c) => next.delete(c.id));
      onSelectedIdsChange(next);
    } else {
      onSelectedIdsChange(new Set([...selectedIds, ...contacts.map((c) => c.id)]));
    }
  };

  const summary = useMemo(() => {
    let selected = 0;
    let suppressed = 0;
    for (const id of selectedIds) {
      const fromPut = putById.get(id);
      if (fromPut) {
        if (fromPut.recipientStatus === 'subscribed') selected += 1;
        else suppressed += 1;
        continue;
      }
      const c = contacts.find((x) => x.id === id);
      const status = c ? recipientStatusForContact(c, putById) : 'subscribed';
      if (status === 'subscribed') selected += 1;
      else suppressed += 1;
    }
    return { selected, suppressed };
  }, [selectedIds, putById, contacts]);

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [summary, onSummaryChange]);

  const importSegment = async (id: string) => {
    if (!id) return;
    setImporting(true);
    setImportMessage('');
    setSegmentModalOpen(false);
    try {
      const res = await api.marketing.campaigns.importSegment(
        accountId,
        campaignId,
        id,
        token,
        [...selectedIds]
      );
      onSelectedIdsChange(new Set(res.mergedContactIds));
      onImportComplete?.(res.recipients);
      const excluded = res.excluded.suppressed;
      setImportMessage(
        excluded > 0
          ? `Imported ${res.imported} contacts. ${res.selected} eligible; ${excluded} excluded (suppressed or unsubscribed).`
          : `Imported ${res.imported} contacts (${res.selected} eligible).`
      );
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Segment import failed');
    } finally {
      setImporting(false);
    }
  };

  const contactsTotal = totalContactsAvailable ?? contacts.length;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-padding-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary-border transition-colors">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-surface flex items-center justify-center text-primary shrink-0">
              <MarketingIcon name="group_add" />
            </div>
            <div>
              <h3 className="text-body-lg text-on-surface">Import from segment</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Select an existing audience group from your CRM or mailing list.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSegmentModalOpen(true)}
            disabled={importing}
            className="px-6 py-2 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors shrink-0"
          >
            Browse Segments
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-padding-card flex flex-col justify-center items-center text-center">
          <p className="text-sm text-on-surface-variant mb-2">Total Contacts Available</p>
          <p className="text-headline-md text-primary">{contactsTotal.toLocaleString()}</p>
          <button type="button" className="mt-2 text-xs text-primary font-bold hover:underline">
            View CRM Analytics
          </button>
        </div>
      </div>

      {importMessage ? (
        <p className="text-sm text-on-surface-variant bg-white border border-gray-200 rounded-lg px-4 py-3">
          {importMessage}
        </p>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MarketingIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipients by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-border focus:outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Filter"
            >
              <MarketingIcon name="filter_list" />
            </button>
            <button
              type="button"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Download"
            >
              <MarketingIcon name="download" />
            </button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-label-caps text-on-surface-variant border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id))}
                  onChange={() => toggleAllShown()}
                />
              </th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email Address</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingContacts && contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                  Loading contacts…
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                  No contacts match your search.
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const status = recipientStatusForContact(c, putById);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleContact(c.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor(c.id)}`}
                        >
                          {initials(c.name || c.email || '?')}
                        </div>
                        <span className="font-medium">{c.name || 'Unnamed'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{c.email ?? '—'}</td>
                    <td className="px-6 py-4">{statusBadge(status)}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-400">—</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <p className="text-xs text-on-surface-variant">
            Showing {contacts.length === 0 ? 0 : 1}-{contacts.length} of {contacts.length} results
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="p-1 px-3 border border-gray-300 rounded text-xs hover:bg-white transition-colors disabled:opacity-50"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="p-1 px-3 border border-gray-300 rounded text-xs hover:bg-white transition-colors"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="p-padding-card bg-primary-surface border border-primary-border rounded-xl flex items-start gap-4">
        <MarketingIcon name="lightbulb" className="text-primary mt-1" />
        <div>
          <h4 className="font-bold text-primary">Pro Tip: Personalization</h4>
          <p className="text-sm text-on-surface-variant mt-1">
            Make sure your recipients have a &apos;First Name&apos; property set to use dynamic merge tags in
            your sequence.{' '}
            <a href="#" className="text-primary font-bold hover:underline">
              Manage Fields →
            </a>
          </p>
        </div>
      </div>

      {segmentModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface">Browse Segments</h3>
            <p className="text-sm text-on-surface-variant">Select a segment to import into this campaign.</p>
            <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {segments.length === 0 ? (
                <li className="px-4 py-6 text-sm text-gray-400 text-center">No segments available.</li>
              ) : (
                segments.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSegmentId(s.id);
                        void importSegment(s.id);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        segmentId === s.id ? 'bg-primary-surface' : ''
                      }`}
                    >
                      <p className="font-medium text-on-surface">{s.name}</p>
                      {s.contactCount != null ? (
                        <p className="text-xs text-gray-500">{s.contactCount} contacts</p>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSegmentModalOpen(false)}
                className="px-4 py-2 text-on-surface-variant font-bold hover:text-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
