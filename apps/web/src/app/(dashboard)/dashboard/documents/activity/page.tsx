'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type DasAuditLog } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';

const PAGE_SIZE = 50;

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function metadataSnippet(meta: Record<string, unknown>): string {
  try {
    const keys = Object.keys(meta);
    if (keys.length === 0) return '—';
    const compact: Record<string, unknown> = {};
    for (const key of keys.slice(0, 4)) {
      const val = meta[key];
      if (val == null) continue;
      if (typeof val === 'object') {
        compact[key] = Array.isArray(val) ? `[${val.length}]` : '{…}';
      } else {
        compact[key] = String(val).slice(0, 40);
      }
    }
    return JSON.stringify(compact);
  } catch {
    return '—';
  }
}

export default function DocumentsActivityPage() {
  const { token, accountId } = useAuthStore();
  const [logs, setLogs] = useState<DasAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.audit.list(accountId, token, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [token, accountId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Activity"
        description="Admin-only audit trail for documents, templates, catalog, and brand changes"
      />

      <div className="mx-6 mt-4 mb-3 flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto shrink-0">
        <Fact label="Events" value={loading ? '—' : total} />
        <Fact
          label="Page"
          value={loading ? '—' : `${page + 1} / ${totalPages}`}
        />
      </div>

      {error && (
        <div className="mx-6 mb-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 mx-6 mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No activity yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50/95 border-b border-gray-100 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Entity
                  </th>
                  <th className="px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Actor
                  </th>
                  <th className="px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Metadata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      <span title={new Date(log.createdAt).toLocaleString()}>
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge color="primary">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 font-medium">{log.entityType}</p>
                      <p className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]">
                        {log.entityId.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {log.actorName || (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 font-mono truncate max-w-[280px]">
                      {metadataSnippet(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
