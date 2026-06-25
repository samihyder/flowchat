'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CampaignRecipientDetail, type Contact, type MarketingSegment } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

type Props = {
  accountId: string;
  campaignId: string;
  token: string;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onSummaryChange?: (summary: { selected: number; suppressed: number }) => void;
  onImportComplete?: (recipients: CampaignRecipientDetail[]) => void;
  lastPutResult?: CampaignRecipientDetail[] | null;
};

const STATUS_BADGE: Record<string, { label: string; color: 'success' | 'warning' | 'gray' }> = {
  subscribed: { label: 'Subscribed', color: 'success' },
  suppressed: { label: 'Suppressed', color: 'warning' },
  no_email: { label: 'No email', color: 'gray' },
};

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

export function CampaignRecipientsStep({
  accountId,
  campaignId,
  token,
  selectedIds,
  onSelectedIdsChange,
  onSummaryChange,
  onImportComplete,
  lastPutResult,
}: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [segmentId, setSegmentId] = useState('');
  const [search, setSearch] = useState('');
  const [subscribedOnly, setSubscribedOnly] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

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
        marketingStatus: subscribedOnly ? 'subscribed' : undefined,
        limit: 50,
      });
      setContacts(res.contacts.filter((c) => c.email || !subscribedOnly));
    } finally {
      setLoadingContacts(false);
    }
  }, [accountId, token, search, subscribedOnly]);

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

  const selectAllShown = () => {
    onSelectedIdsChange(new Set([...selectedIds, ...contacts.map((c) => c.id)]));
  };

  const clearSelection = () => onSelectedIdsChange(new Set());

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

  const importSegment = async () => {
    if (!segmentId) return;
    setImporting(true);
    setImportMessage('');
    try {
      const res = await api.marketing.campaigns.importSegment(
        accountId,
        campaignId,
        segmentId,
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

  return (
    <div className="max-w-[1024px] mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Recipients</h2>
        <p className="text-sm text-gray-500 mt-1">
          Search contacts or import a segment. Suppressed contacts are excluded when you save.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-mkt-primary-border transition-colors">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-lg bg-mkt-primary-surface flex items-center justify-center text-mkt-primary shrink-0">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Import from segment</p>
              <p className="text-sm text-gray-500">Merge a saved segment into this campaign.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              className="flex-1 min-w-[180px] border border-gray-200 rounded-lg text-sm px-3 py-2"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
            >
              <option value="">Choose segment…</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.contactCount != null ? ` (${s.contactCount})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!segmentId || importing}
              onClick={() => void importSegment()}
              className="bg-mkt-primary hover:bg-mkt-primary-hover text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>

        <div className="bg-mkt-primary-surface border border-mkt-primary-border rounded-xl p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selected</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{selectedIds.size}</p>
          <p className="text-xs text-gray-500 mt-2">
            {summary.selected} eligible
            {summary.suppressed > 0 && (
              <span className="text-amber-600"> · {summary.suppressed} excluded</span>
            )}
          </p>
        </div>
      </div>

      {importMessage && (
        <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-3">
          {importMessage}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-mkt-primary-border"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={subscribedOnly}
              onChange={(e) => setSubscribedOnly(e.target.checked)}
              className="rounded border-gray-300 text-mkt-primary"
            />
            Subscribed only
          </label>
          <button type="button" onClick={selectAllShown} className="text-sm text-mkt-primary font-medium">
            Select all shown
          </button>
          <button type="button" onClick={clearSelection} className="text-sm text-gray-500">
            Clear
          </button>
        </div>

        <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {loadingContacts && contacts.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400">Loading contacts…</li>
          ) : contacts.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400">No contacts match your search.</li>
          ) : (
            contacts.map((c) => {
              const status = recipientStatusForContact(c, putById);
              const badge = STATUS_BADGE[status] ?? STATUS_BADGE.subscribed!;
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="rounded border-gray-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email ?? 'No email'}</p>
                    </div>
                    <Badge color={badge.color}>{badge.label}</Badge>
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
