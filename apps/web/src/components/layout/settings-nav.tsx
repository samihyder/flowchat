'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { SETTINGS_META } from '@/lib/settings-meta';

type NavItem = { label: string; href: Route; icon: string };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Account', href: '/settings/account' as Route, icon: 'apartment' },
      { label: 'Security', href: '/settings/security' as Route, icon: 'lock' },
      { label: 'Agents', href: '/settings/agents' as Route, icon: 'person' },
      { label: 'Teams', href: '/settings/teams' as Route, icon: 'group' },
    ],
  },
  {
    title: 'Channels',
    items: [{ label: 'Inboxes', href: '/settings/inboxes' as Route, icon: 'inbox' }],
  },
  {
    title: 'Automation',
    items: [
      { label: 'Labels', href: '/settings/labels' as Route, icon: 'label' },
      { label: 'Canned responses', href: '/settings/canned-responses' as Route, icon: 'chat' },
      { label: 'Auto messages', href: '/settings/auto-messages' as Route, icon: 'smart_toy' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'Connected services', href: '/settings/connected-services' as Route, icon: 'electrical_services' },
      { label: 'Integrations', href: '/settings/integrations' as Route, icon: 'hub' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'CRM settings', href: '/settings/crm' as Route, icon: 'contacts' },
      { label: 'LeadSnapper', href: '/settings/leadsnapper' as Route, icon: 'travel_explore' },
      { label: 'Enrichment flows', href: '/settings/enrichment-flows' as Route, icon: 'auto_awesome' },
      { label: 'Email marketing', href: '/settings/email-marketing' as Route, icon: 'mail' },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const meta = SETTINGS_META[pathname] ?? {
    title: 'Account settings',
    description: 'Workspace configuration',
  };
  const activeSection =
    sections.find((s) => s.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)))
      ?.title ?? 'General';

  return (
    <header className="settings-module-nav shrink-0 border-b border-primary-200/80 bg-gradient-to-r from-teal-950 via-cyan-900 to-teal-800 text-white shadow-sm">
      <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90">
            FlowChat
          </p>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Settings</h1>
          <p className="text-xs text-cyan-100/80 mt-0.5 hidden sm:block">{meta.description}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-50">
          <span className="material-symbols-outlined text-[14px]" aria-hidden>
            tune
          </span>
          {activeSection}
        </div>
      </div>

      <nav
        className="px-2 sm:px-4 pb-0 overflow-x-auto scrollbar-thin"
        aria-label="Settings sections"
      >
        <div className="flex items-end gap-0.5 min-w-max">
          {sections.map((section, sectionIndex) => (
            <div key={section.title} className="flex items-end gap-0.5">
              {sectionIndex > 0 && (
                <span
                  className="self-center mx-1.5 w-px h-6 bg-white/20 shrink-0"
                  aria-hidden
                />
              )}
              <span className="self-center px-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-200/55 select-none hidden xl:inline">
                {section.title}
              </span>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`relative group inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-colors ${
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
                    {active && (
                      <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
