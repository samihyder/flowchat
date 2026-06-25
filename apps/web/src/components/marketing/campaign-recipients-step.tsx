'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CampaignRecipientDetail, type Contact, type MarketingSegment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const selectedContacts = useMemo(() => {
    const fromList = contacts.filter((c) => selectedIds.has(c.id));
    const knownIds = new Set(fromList.map((c) => c.id));
    const extras = (lastPutResult ?? []).filter(
      (r) => selectedIds.has(r.contactId) && !knownIds.has(r.contactId)
    );
    return {
      listed: fromList,
      extras: extras.map((r) => ({
        id: r.contactId,
        name: r.name,
        email: r.email,
        recipientStatus: r.recipientStatus,
      })),
    };
  }, [contacts, selectedIds, lastPutResult]);

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
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Recipients</h2>
        <p className="text-sm text-gray-500">
          Search contacts or import a segment. Suppressed and unsubscribed contacts are excluded when
          you save.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-gray-800">Import from segment</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg text-sm px-3 py-2"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
          >
            <option value="">Choose a segment…</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.contactCount != null ? ` (${s.contactCount})` : ''}
                {s.segmentType === 'dynamic' ? ' — dynamic' : ''}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            disabled={!segmentId || importing}
            onClick={() => void importSegment()}
          >
            {importing ? 'Importing…' : 'Import segment'}
          </Button>
        </div>
        {importMessage && <p className="text-xs text-gray-600">{importMessage}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="max-w-sm"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={subscribedOnly}
              onChange={(e) => setSubscribedOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Subscribed only
          </label>
        </div>

        <div className="flex gap-2 items-center">
          <Button type="button" variant="secondary" size="sm" onClick={selectAllShown}>
            Select all shown
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={clearSelection}>
            Clear
          </Button>
          <span className="text-sm text-gray-500 ml-auto">
            {selectedIds.size} selected
            {summary.suppressed > 0 && (
              <span className="text-amber-600 ml-2">
                ({summary.suppressed} will be excluded)
              </span>
            )}
          </span>
        </div>

        <ul className="bg-white border border-gray-200 rounded-xl divide-y max-h-80 overflow-y-auto">
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

      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Selection summary</p>
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">{summary.selected}</strong> eligible recipient
            {summary.selected === 1 ? '' : 's'}
            {summary.suppressed > 0 && (
              <>
                {' '}
                · <span className="text-amber-700">{summary.suppressed} excluded</span> (suppressed,
                bounced, or missing email)
              </>
            )}
          </p>
          {selectedContacts.extras.length > 0 && (
            <ul className="mt-3 text-xs text-gray-500 space-y-1">
              {selectedContacts.extras.map((c) => (
                <li key={c.id}>
                  {c.name} — {c.email}{' '}
                  <Badge color={STATUS_BADGE[c.recipientStatus]?.color ?? 'gray'}>
                    {STATUS_BADGE[c.recipientStatus]?.label ?? c.recipientStatus}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
