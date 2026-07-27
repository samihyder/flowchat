'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type ReportAgentRow, type ReportOverviewMetrics } from '@/lib/api';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';

function formatMs(ms: number | null | undefined) {
  if (ms == null || ms === 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem ? `${mins}m ${rem}s` : `${mins}m`;
}

export default function ReportsPage() {
  const { token, accountId } = useAuthStore();
  const [metrics, setMetrics] = useState<ReportOverviewMetrics | null>(null);
  const [agents, setAgents] = useState<ReportAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.reports.overview(accountId, token),
      api.reports.agents(accountId, token),
    ])
      .then(([overview, agentRes]) => {
        setMetrics(overview.metrics);
        setAgents(agentRes.agents);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      })
      .finally(() => setLoading(false));
  }, [token, accountId]);

  const num = (key: string) => {
    const v = metrics?.[key];
    return typeof v === 'number' ? v : Number(v) || 0;
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      <header className="h-14 bg-white border-b border-gray-200 px-5 flex items-center justify-between gap-4 shrink-0">
        <div>
          <p className="text-base font-semibold text-gray-900">Reports</p>
          <p className="text-xs text-gray-500">Workspace performance overview</p>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Overview</h2>
              <p className="text-sm text-gray-500 mt-0.5">Last 30 days</p>
            </div>

            <MetricGrid>
              <MetricCard label="Conversations created" value={num('conversationsCreated')} />
              <MetricCard label="Resolved" value={num('conversationsResolved')} />
              <MetricCard label="Open" value={num('openConversations')} />
              <MetricCard label="Messages" value={num('messagesCreated')} />
              <MetricCard
                label="Avg first response"
                value={formatMs(num('avgFirstResponseMs'))}
                accent="neutral"
              />
              <MetricCard
                label="Avg resolution"
                value={formatMs(num('avgResolutionMs'))}
                accent="neutral"
              />
            </MetricGrid>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Agent performance</h3>
              </div>
              {agents.length === 0 ? (
                <p className="p-5 text-sm text-gray-500">No agent data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-2.5 font-medium">Agent</th>
                        <th className="px-5 py-2.5 font-medium">Resolved</th>
                        <th className="px-5 py-2.5 font-medium">Avg FRT</th>
                        <th className="px-5 py-2.5 font-medium">CSAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {agents.map((row) => (
                        <tr key={row.agentId}>
                          <td className="px-5 py-2.5 text-gray-900">
                            {(row.agentName as string) || row.agentId}
                          </td>
                          <td className="px-5 py-2.5 text-gray-700">
                            {Number(row.resolvedCount ?? row.resolved ?? 0)}
                          </td>
                          <td className="px-5 py-2.5 text-gray-700">
                            {formatMs(
                              (row.avgFrtMs as number | null | undefined) ??
                                (row.avgFirstResponseMs as number | null | undefined)
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-gray-700">
                            {row.csatAvg != null ? Number(row.csatAvg).toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
