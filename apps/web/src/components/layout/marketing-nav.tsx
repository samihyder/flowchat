'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

const items: { label: string; href: Route; icon: string }[] = [
  { label: 'Campaigns', href: '/dashboard/marketing/campaigns', icon: 'mail' },
  { label: 'Templates', href: '/dashboard/marketing/templates', icon: 'description' },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="px-6 pt-3 pb-0 border-b border-gray-200 bg-mkt-surface shrink-0">
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const active =
            item.href === '/dashboard/marketing/campaigns'
              ? pathname.startsWith('/dashboard/marketing/campaigns')
              : pathname.startsWith('/dashboard/marketing/templates');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                active
                  ? 'text-mkt-primary bg-mkt-primary-surface font-semibold'
                  : 'text-mkt-on-surface-variant hover:bg-gray-50'
              }`}
            >
              <MarketingIcon name={item.icon} className="text-[20px]" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
