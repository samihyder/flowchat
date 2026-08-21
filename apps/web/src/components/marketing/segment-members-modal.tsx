'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Contact, type MarketingSegment } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

type Member = { id: string; name: string; email: string | null; type: string; marketingStatus: string };

export function SegmentMembersModal({
  segment,
  onClose,
}: {
  segment: MarketingSegment;
  onClose: () => void;
}) {
  const { token, accountId } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);

  const load = () => {
    if (!token || !accountId) return;
    setLoading(true);
    api.marketing.segments
      .listMembers(accountId, segment.id, token)
      .then((r) => setMembers(r.members))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, accountId, segment.id]);

  useEffect(() => {
    if (!token || !accountId || !q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api.contacts
        .list(accountId, token, { q: q.trim(), limit: 8 })
        .then((r) => setResults(r.contacts))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, token, accountId]);

  const memberIds = new Set(members.map((m) => m.id));

  const addContact = async (contactId: string) => {
    if (!token || !accountId) return;
    setBusyId(contactId);
    try {
      await api.marketing.segments.addMembers(accountId, segment.id, [contactId], token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const removeContact = async (contactId: string) => {
    if (!token || !accountId) return;
    setBusyId(contactId);
    try {
      await api.marketing.segments.removeMember(accountId, segment.id, contactId, token);
      setMembers((prev) => prev.filter((m) => m.id !== contactId));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 truncate">{segment.name}</h2>
            <p className="text-xs text-gray-500">
              {members.length} contact{members.length === 1 ? '' : 's'} on this list
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none p-1 -m-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 border-b border-gray-100 shrink-0">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts to add…"
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 pr-8 focus:ring-2 focus:ring-primary-border"
            />
            <MarketingIcon
              name="search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]"
            />
          </div>
          {q.trim() && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {searching ? (
                <p className="text-xs text-gray-400 px-1 py-1">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-xs text-gray-400 px-1 py-1">No contacts found.</p>
              ) : (
                results.map((c) => {
                  const already = memberIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                        {c.email && <p className="text-[11px] text-gray-400 truncate">{c.email}</p>}
                      </div>
                      <button
                        type="button"
                        disabled={already || busyId === c.id}
                        onClick={() => void addContact(c.id)}
                        className="text-xs font-semibold text-primary hover:underline disabled:text-gray-300 disabled:no-underline shrink-0"
                      >
                        {already ? 'Added' : busyId === c.id ? '…' : '+ Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading members…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No contacts on this list yet — search above to add some.
            </p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {m.email ?? 'No email'}
                      {m.marketingStatus === 'unsubscribed' && (
                        <span className="text-amber-600"> · unsubscribed</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => void removeContact(m.id)}
                    className="text-xs text-gray-400 hover:text-status-danger-text shrink-0"
                    aria-label={`Remove ${m.name} from list`}
                  >
                    {busyId === m.id ? '…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
