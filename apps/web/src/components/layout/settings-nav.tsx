'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

type NavItem = { label: string; href: Route; icon?: string };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Account', href: '/settings/account', icon: '🏢' },
      { label: 'Security', href: '/settings/security', icon: '🔒' },
      { label: 'Agents', href: '/settings/agents', icon: '👤' },
      { label: 'Teams', href: '/settings/teams', icon: '👥' },
    ],
  },
  {
    title: 'Channels',
    items: [{ label: 'Inboxes', href: '/settings/inboxes', icon: '📥' }],
  },
  {
    title: 'Automation',
    items: [
      { label: 'Labels', href: '/settings/labels' as Route, icon: '🏷' },
      { label: 'Canned responses', href: '/settings/canned-responses' as Route, icon: '💬' },
      { label: 'Auto messages', href: '/settings/auto-messages' as Route, icon: '🤖' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'Connected services', href: '/settings/connected-services' as Route, icon: '🔌' },
      { label: 'Integrations', href: '/settings/integrations' as Route, icon: '🔗' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'CRM settings', href: '/settings/crm' as Route, icon: '📇' },
      { label: 'LeadSnapper', href: '/settings/leadsnapper' as Route, icon: '🧲' },
      { label: 'Enrichment flows', href: '/settings/enrichment-flows' as Route, icon: '✨' },
      { label: 'Email marketing', href: '/settings/email-marketing' as Route, icon: '📧' },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full lg:w-52 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-3 overflow-y-auto">
      {sections.map((section) => (
        <div key={section.title} className="mb-3 last:mb-0">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
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
                  {item.icon && <span className="text-sm opacity-70">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
