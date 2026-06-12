'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';

const settingsNav: { label: string; href: Route }[] = [
  { label: 'Account', href: '/settings/account' },
  { label: 'Inboxes', href: '/settings/inboxes' },
  { label: 'Labels', href: '/settings/labels' as Route },
  { label: 'Agents', href: '/settings/agents' },
  { label: 'Teams', href: '/settings/teams' },
  { label: 'Security', href: '/settings/security' },
  { label: 'Shortcuts', href: '/settings/canned-responses' as Route },
  { label: 'Integrations', href: '/settings/integrations' as Route },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader title="Settings" description="Manage your workspace, channels, and team" />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <nav className="lg:w-52 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 overflow-auto bg-gray-50/50">{children}</div>
      </div>
    </div>
  );
}
