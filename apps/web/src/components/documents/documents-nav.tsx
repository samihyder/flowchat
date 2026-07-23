'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';

type NavItem = {
  label: string;
  href: Route;
  icon: string;
  match?: (path: string) => boolean;
};

const SUB_ROUTES = [
  'templates',
  'catalog',
  'brand',
  'clients',
  'activity',
  'notifications',
] as const;

const items: NavItem[] = [
  {
    label: 'Documents',
    href: '/dashboard/documents' as Route,
    icon: 'description',
    match: (path) =>
      path === '/dashboard/documents' ||
      (/^\/dashboard\/documents\/[^/]+$/.test(path) &&
        !SUB_ROUTES.includes((path.split('/')[3] ?? '') as (typeof SUB_ROUTES)[number])),
  },
  {
    label: 'Templates',
    href: '/dashboard/documents/templates' as Route,
    icon: 'article',
  },
  {
    label: 'Catalog',
    href: '/dashboard/documents/catalog' as Route,
    icon: 'inventory_2',
  },
  {
    label: 'Brand & assets',
    href: '/dashboard/documents/brand' as Route,
    icon: 'palette',
  },
  {
    label: 'Clients',
    href: '/dashboard/documents/clients' as Route,
    icon: 'apartment',
  },
  {
    label: 'Activity',
    href: '/dashboard/documents/activity' as Route,
    icon: 'history',
  },
  {
    label: 'Notifications',
    href: '/dashboard/documents/notifications' as Route,
    icon: 'notifications',
  },
];

const crmLinks: { label: string; href: Route; icon: string }[] = [
  { label: 'Contacts', href: '/dashboard/contacts' as Route, icon: 'person_search' },
  { label: 'Inbox', href: '/dashboard' as Route, icon: 'forum' },
  {
    label: 'Campaigns',
    href: marketingRoutes.campaigns as Route,
    icon: 'campaign',
  },
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
    <header className="documents-module-nav shrink-0 border-b border-primary-200/80 bg-gradient-to-r from-teal-950 via-cyan-900 to-teal-800 text-white shadow-sm">
      <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90">
            FlowChat
          </p>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Documents
          </h1>
          <p className="text-xs text-cyan-100/80 mt-0.5 hidden sm:block">
            Quotations, invoices, and agreements linked to your CRM
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-cyan-200/70 mr-1 hidden md:inline">
            Jump to
          </span>
          {crmLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-cyan-50 hover:bg-white/20 hover:border-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden>
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <nav
        className="px-2 sm:px-4 pb-0 overflow-x-auto scrollbar-thin"
        aria-label="Documents sections"
      >
        <div className="flex items-end gap-0.5 min-w-max">
          {items.map((item) => {
            const active = item.match
              ? item.match(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showBadge = item.label === 'Notifications' && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-colors ${
                  active
                    ? 'bg-white text-primary-800'
                    : 'text-cyan-50/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    active ? 'text-primary-600' : 'text-cyan-200/80'
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                {item.label}
                {showBadge && (
                  <span className="inline-flex min-w-[1.15rem] h-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-teal-950">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
