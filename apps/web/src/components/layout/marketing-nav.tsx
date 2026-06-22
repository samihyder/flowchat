'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

const items: { label: string; href: Route; icon: string }[] = [
  { label: 'Email automations', href: '/dashboard/marketing', icon: '📧' },
  { label: 'Templates', href: '/dashboard/marketing/templates', icon: '📝' },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <div className="px-6 pt-2 pb-0 border-b border-gray-200 bg-white shrink-0">
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const active =
            item.href === '/dashboard/marketing'
              ? pathname === '/dashboard/marketing' ||
                pathname.startsWith('/dashboard/marketing/new') ||
                (pathname.startsWith('/dashboard/marketing/') &&
                  !pathname.includes('/templates'))
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
