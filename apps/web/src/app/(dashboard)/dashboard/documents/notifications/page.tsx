'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type DasNotification } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/format';

export default function DocumentsNotificationsPage() {
  const { token, accountId } = useAuthStore();
  const [notifications, setNotifications] = useState<DasNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.notifications.list(accountId, token, { limit: 100 });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token, accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllRead = async () => {
    if (!token || !accountId || unreadCount === 0) return;
    setBusy(true);
    try {
      await api.das.notifications.markRead(accountId, { markAllRead: true }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark read');
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (id: string) => {
    if (!token || !accountId) return;
    try {
      await api.das.notifications.markRead(accountId, { ids: [id] }, token);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Notifications"
        description={
          loading
            ? 'Document approval alerts'
            : `${unreadCount} unread · ${notifications.length} total`
        }
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            Mark all read
          </Button>
        }
      />

      {error && (
        <div className="mx-6 mb-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex-1 mx-6 mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-0">
        <div className="h-full overflow-y-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((n) => {
                const href =
                  n.entityType === 'document' && n.entityId
                    ? (`/dashboard/documents/${n.entityId}` as Route)
                    : null;
                const unread = !n.readAt;
                return (
                  <li
                    key={n.id}
                    className={`border-b border-gray-100 px-4 py-3 ${
                      unread ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {href ? (
                          <Link
                            href={href}
                            className="text-sm font-medium text-gray-900 hover:text-primary-700"
                            onClick={() => {
                              if (unread) void markOne(n.id);
                            }}
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        )}
                        {n.body && (
                          <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                      {unread && (
                        <button
                          type="button"
                          className="text-xs text-primary-600 hover:underline shrink-0"
                          onClick={() => void markOne(n.id)}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
