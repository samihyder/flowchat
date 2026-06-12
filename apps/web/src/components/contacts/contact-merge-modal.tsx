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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Merge duplicate contacts</h2>
        {loading && <p className="text-sm text-gray-400">Scanning for duplicates…</p>}
        {!loading && groups.length === 0 && (
          <p className="text-sm text-gray-500">No duplicate email or phone matches found.</p>
        )}
        {groups.map((group) => (
          <div key={group.key} className="border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Same {group.field}: <span className="text-gray-900">{group.value}</span>
            </p>
            <p className="text-xs text-gray-500">Keep this contact (others will be merged into it):</p>
            <select
              value={selections[group.key] ?? ''}
              onChange={(e) => setSelections({ ...selections, [group.key]: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            >
              {group.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={merging === group.key}
              onClick={() => void mergeGroup(group)}
            >
              {merging === group.key ? 'Merging…' : `Merge ${group.contacts.length} contacts`}
            </Button>
          </div>
        ))}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
