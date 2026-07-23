'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

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
        ].includes(path.split('/')[3] ?? '')),
  },
  { label: 'Templates', href: '/dashboard/documents/templates' as Route },
  { label: 'Catalog', href: '/dashboard/documents/catalog' as Route },
  { label: 'Brand & assets', href: '/dashboard/documents/brand' as Route },
  { label: 'Clients', href: '/dashboard/documents/clients' as Route },
  { label: 'Activity', href: '/dashboard/documents/activity' as Route },
];

export function DocumentsNav() {
  const pathname = usePathname();

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
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
