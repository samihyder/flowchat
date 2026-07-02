'use client';

import { useEffect, useState } from 'react';
import { api, type DuplicateGroup } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  onMerged: () => void;
};

export function ContactMergeModal({ open, onClose, onMerged }: Props) {
  const { token, accountId } = useAuthStore();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !token || !accountId) return;
    setLoading(true);
    api.contacts
      .listDuplicates(accountId, token)
      .then((r) => {
        setGroups(r.groups);
        const init: Record<string, string> = {};
        for (const g of r.groups) {
          init[g.key] = g.contacts[0]?.id ?? '';
        }
        setSelections(init);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [open, token, accountId]);

  if (!open) return null;

  const mergeGroup = async (group: DuplicateGroup) => {
    if (!token || !accountId) return;
    const primaryId = selections[group.key];
    if (!primaryId) return;
    setMerging(group.key);
    try {
      for (const c of group.contacts) {
        if (c.id !== primaryId) {
          await api.contacts.merge(accountId, primaryId, c.id, token);
        }
      }
      onMerged();
      setGroups((prev) => prev.filter((g) => g.key !== group.key));
    } finally {
      setMerging(null);
    }
  };

  const affected = groups.reduce((sum, g) => sum + g.contacts.length, 0);
  const removed = groups.reduce((sum, g) => sum + g.contacts.length - 1, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Merge duplicate contacts</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && <p className="text-sm text-gray-400">Scanning for duplicates…</p>}
          {!loading && groups.length === 0 && (
            <p className="text-sm text-gray-500">No duplicate email or phone matches found.</p>
          )}

          {!loading && groups.length > 0 && (
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex-1 text-center py-3 border-r border-gray-100">
                <p className="text-lg font-bold text-gray-900">{groups.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Groups found</p>
              </div>
              <div className="flex-1 text-center py-3 border-r border-gray-100">
                <p className="text-lg font-bold text-gray-900">{affected}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Contacts affected</p>
              </div>
              <div className="flex-1 text-center py-3">
                <p className="text-lg font-bold text-amber-700">{removed}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Will be removed</p>
              </div>
            </div>
          )}

          {groups.map((group) => {
            const chosen = selections[group.key];
            return (
              <div key={group.key} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    Matched by {group.field}
                  </span>
                  <span className="text-xs font-medium text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
                    {group.value}
                  </span>
                </div>
                <div
                  className="grid overflow-x-auto"
                  style={{ gridTemplateColumns: `100px repeat(${group.contacts.length}, minmax(160px, 1fr))` }}
                >
                  <div />
                  {group.contacts.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 px-3 py-2.5 border-l border-gray-100 cursor-pointer ${
                        chosen === c.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`merge-${group.key}`}
                        checked={chosen === c.id}
                        onChange={() => setSelections({ ...selections, [group.key]: c.id })}
                      />
                      <span className="text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                      {chosen === c.id && (
                        <span className="ml-auto text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-0.5 shrink-0">
                          Keep
                        </span>
                      )}
                    </label>
                  ))}

                  <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-400 border-t border-gray-100">
                    Email
                  </div>
                  {group.contacts.map((c) => (
                    <div
                      key={c.id}
                      className={`px-3 py-2 text-sm border-l border-t border-gray-100 truncate ${
                        chosen === c.id ? 'bg-primary-50/50 font-medium text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {c.email ?? <span className="text-gray-400">— empty</span>}
                    </div>
                  ))}

                  <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-400 border-t border-gray-100">
                    Phone
                  </div>
                  {group.contacts.map((c) => (
                    <div
                      key={c.id}
                      className={`px-3 py-2 text-sm border-l border-t border-gray-100 truncate ${
                        chosen === c.id ? 'bg-primary-50/50 font-medium text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {c.phone ?? <span className="text-gray-400">— empty</span>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end px-4 py-2.5 bg-slate-50 border-t border-gray-200">
                  <Button
                    type="button"
                    size="sm"
                    disabled={merging === group.key}
                    onClick={() => void mergeGroup(group)}
                  >
                    {merging === group.key ? 'Merging…' : `Merge ${group.contacts.length} contacts`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 flex justify-end px-6 py-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
