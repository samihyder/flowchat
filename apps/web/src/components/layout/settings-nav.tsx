'use client';

import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { ModuleSidebar, type ModuleNavSection } from '@/components/layout/module-sidebar';

type NavItem = { label: string; href: Route; icon: string };
type NavSection = { title: string; items: NavItem[] };

// Ordered by how often a workspace touches each area day-to-day.
const sections: NavSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Account', href: '/settings/account' as Route, icon: 'apartment' },
      { label: 'Security', href: '/settings/security' as Route, icon: 'lock' },
      { label: 'Agents', href: '/settings/agents' as Route, icon: 'person' },
      { label: 'Teams', href: '/settings/teams' as Route, icon: 'group' },
      { label: 'Roles', href: '/settings/roles' as Route, icon: 'badge' },
    ],
  },
  {
    title: 'Channels',
    items: [{ label: 'Inboxes', href: '/settings/inboxes' as Route, icon: 'inbox' }],
  },
  {
    title: 'Automation',
    items: [
      { label: 'Rules', href: '/settings/automation-rules' as Route, icon: 'rule' },
      { label: 'Macros', href: '/settings/macros' as Route, icon: 'bolt' },
      { label: 'Labels', href: '/settings/labels' as Route, icon: 'label' },
      { label: 'Canned responses', href: '/settings/canned-responses' as Route, icon: 'chat' },
      { label: 'Auto messages', href: '/settings/auto-messages' as Route, icon: 'smart_toy' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'CRM settings', href: '/settings/crm' as Route, icon: 'contacts' },
      { label: 'Email marketing', href: '/settings/email-marketing' as Route, icon: 'mail' },
      { label: 'LeadSnapper', href: '/settings/leadsnapper' as Route, icon: 'travel_explore' },
      { label: 'Enrichment flows', href: '/settings/enrichment-flows' as Route, icon: 'auto_awesome' },
    ],
  },
  {
    title: 'AI',
    items: [{ label: 'Assistants', href: '/settings/ai-assistants' as Route, icon: 'psychology' }],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'SLA', href: '/settings/sla' as Route, icon: 'timer' },
      { label: 'Notifications', href: '/settings/notifications' as Route, icon: 'notifications' },
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
    title: 'Help',
    items: [{ label: 'Help Center', href: '/settings/help-center' as Route, icon: 'menu_book' }],
  },
];

export function SettingsNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const moduleSections: ModuleNavSection[] = sections.map((s) => ({
    label: s.title,
    items: s.items,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">FlowChat</p>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">Settings</h1>
      </div>
      <ModuleSidebar sections={moduleSections} isActive={isActive} onNavigate={onNavigate} />
    </div>
  );
}
