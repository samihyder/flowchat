'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

type NavItem = { label: string; href: Route; match?: (path: string) => boolean };

const items: NavItem[] = [
  {
    label: 'Documents',
    href: '/dashboard/documents' as Route,
    match: (path) =>
      path === '/dashboard/documents' ||
      (/^\/dashboard\/documents\/[^/]+$/.test(path) &&
        ![
          'templates',
          'catalog',
          'brand',
          'clients',
          'activity',
          'notifications',
        ].includes(path.split('/')[3] ?? '')),
  },
  { label: 'Templates', href: '/dashboard/documents/templates' as Route },
  { label: 'Catalog', href: '/dashboard/documents/catalog' as Route },
  { label: 'Brand & assets', href: '/dashboard/documents/brand' as Route },
  { label: 'Clients', href: '/dashboard/documents/clients' as Route },
  { label: 'Activity', href: '/dashboard/documents/activity' as Route },
  { label: 'Notifications', href: '/dashboard/documents/notifications' as Route },
];

export function DocumentsNav() {
  const pathname = usePathname();
  const { token, accountId } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!token || !accountId) return;
    try {
      const res = await api.das.notifications.list(accountId, token, {
        unreadOnly: true,
        limit: 1,
      });
      setUnreadCount(res.unreadCount);
    } catch {
      /* ignore */
    }
  }, [token, accountId]);

  useEffect(() => {
    void loadUnread();
    const handle = window.setInterval(() => void loadUnread(), 60_000);
    return () => window.clearInterval(handle);
  }, [loadUnread, pathname]);

  return (
    <nav className="w-full lg:w-52 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-3 overflow-y-auto">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Documents
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = item.match
            ? item.match(pathname)
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showBadge =
            item.label === 'Notifications' && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
