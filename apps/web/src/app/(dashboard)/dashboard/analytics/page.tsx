'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Inbox, type InboxAnalytics } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';

type DatePreset = 'today' | '7d' | '30d' | 'custom';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function presetRange(preset: DatePreset): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  if (preset === 'today') return { from: startOfDay(new Date()), to };
  if (preset === '7d') {
    const from = startOfDay(new Date());
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - 29);
  return { from, to };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(date: string) {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const statCards: { key: keyof InboxAnalytics['summary']; label: string }[] = [
  { key: 'totalVisits', label: 'Page visits' },
  { key: 'uniqueVisitors', label: 'Unique visitors' },
  { key: 'chatsStarted', label: 'Chats started' },
  { key: 'totalMessages', label: 'Messages' },
  { key: 'openConversations', label: 'Open chats' },
  { key: 'resolvedConversations', label: 'Resolved' },
];

export default function AnalyticsPage() {
  const { token, accountId } = useAuthStore();
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [inboxId, setInboxId] = useState('');
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [analytics, setAnalytics] = useState<InboxAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !accountId) {
      setLoading(false);
      return;
    }
    api.inboxes
      .list(accountId, token)
      .then((r) => {
        setInboxes(r.inboxes);
        if (r.inboxes[0]) setInboxId(r.inboxes[0].id);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, accountId]);

  const range = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    if (!token || !accountId || !inboxId) return;
    setLoadingData(true);
    setError('');
    api.inboxes
      .analytics(accountId, inboxId, token, {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      })
      .then(setAnalytics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingData(false));
  }, [token, accountId, inboxId, range.from, range.to]);

  const maxDaily = Math.max(...(analytics?.daily.map((d) => d.visits) ?? [1]), 1);

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Analytics"
        description="Per-website visits, active chats, and conversation metrics."
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Website / inbox</label>
            <select
              value={inboxId}
              onChange={(e) => setInboxId(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
              disabled={loading || inboxes.length === 0}
            >
              {inboxes.map((inbox) => (
                <option key={inbox.id} value={inbox.id}>
                  {inbox.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Date range</label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['today', 'Today'],
                  ['7d', '7 days'],
                  ['30d', '30 days'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreset(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    preset === id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading || loadingData ? (
          <ListSkeleton rows={4} />
        ) : !analytics ? (
          <p className="text-sm text-gray-500">Select an inbox to view analytics.</p>
        ) : (
          <>
            {analytics.inbox.websiteUrl && (
              <p className="text-xs text-gray-500">
                Website:{' '}
                <a
                  href={analytics.inbox.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  {analytics.inbox.websiteUrl}
                </a>
                {analytics.inbox.defaultAssigneeName && (
                  <span className="ml-3">Default agent: {analytics.inbox.defaultAssigneeName}</span>
                )}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map(({ key, label }) => (
                <Card key={key}>
                  <CardBody className="py-4">
                    <p className="text-2xl font-bold text-gray-900">{analytics.summary[key]}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </CardBody>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader title="Daily activity" description="Visits per day in selected range" />
              <CardBody>
                {analytics.daily.length === 0 ? (
                  <p className="text-sm text-gray-400">No data for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.daily.map((day) => (
                      <div key={day.date} className="flex items-center gap-3 text-xs">
                        <span className="w-16 shrink-0 text-gray-500">{formatShortDate(day.date)}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded transition-all"
                            style={{ width: `${Math.max(4, (day.visits / maxDaily) * 100)}%` }}
                            title={`${day.visits} visits`}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-700 font-medium">{day.visits}</span>
                        <span className="w-14 text-right text-gray-400">{day.conversations} chats</span>
                        <span className="w-14 text-right text-gray-400">{day.messages} msgs</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Active chats"
                description="Open conversations with visitor IP addresses"
              />
              <CardBody className="p-0 overflow-x-auto">
                {analytics.activeChats.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">No active chats right now.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                        <th className="px-5 py-3 font-medium">Contact</th>
                        <th className="px-5 py-3 font-medium">IP address</th>
                        <th className="px-5 py-3 font-medium">Assignee</th>
                        <th className="px-5 py-3 font-medium">Started</th>
                        <th className="px-5 py-3 font-medium">Unread</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {analytics.activeChats.map((chat) => (
                        <tr key={chat.conversationId} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{chat.contactName}</p>
                            {chat.contactEmail && (
                              <p className="text-xs text-gray-400">{chat.contactEmail}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">
                            {chat.ipAddress ?? '—'}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{chat.assigneeName ?? 'Unassigned'}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {formatDate(chat.startedAt)}
                          </td>
                          <td className="px-5 py-3 text-gray-700">{chat.unreadCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent visits" description="Latest widget loads on this website" />
              <CardBody className="p-0 overflow-x-auto">
                {analytics.recentVisits.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">No visits recorded in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                        <th className="px-5 py-3 font-medium">Time</th>
                        <th className="px-5 py-3 font-medium">IP address</th>
                        <th className="px-5 py-3 font-medium">Page</th>
                        <th className="px-5 py-3 font-medium">User agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {analytics.recentVisits.map((visit, i) => (
                        <tr key={`${visit.visitedAt}-${i}`} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(visit.visitedAt)}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">
                            {visit.ipAddress ?? '—'}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                            {visit.pageUrl ?? '—'}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400 max-w-[240px] truncate">
                            {visit.userAgent ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
