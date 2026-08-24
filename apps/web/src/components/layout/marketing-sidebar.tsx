'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { ModuleSidebar, type ModuleNavSection } from '@/components/layout/module-sidebar';

const CRM_HOME = '/dashboard/contacts' as const;

// Grouped and ordered the way a campaign gets built: send & monitor first,
// then the content/audience building blocks.
// Workflows (CRM-triggered automation) was retired in favor of campaign-only
// outreach (S6M-35) — its route just redirects to Campaigns, so it's left
// out of the nav rather than pointing at a dead end.
const navSections: ModuleNavSection[] = [
  {
    label: 'Send',
    items: [{ label: 'Campaigns', href: marketingRoutes.campaigns, icon: 'mail' }],
  },
  {
    label: 'Build',
    items: [
      { label: 'Templates', href: marketingRoutes.templates, icon: 'description' },
      { label: 'Segments', href: marketingRoutes.segments, icon: 'groups' },
    ],
  },
  {
    label: 'Automate',
    items: [{ label: 'Automations', href: marketingRoutes.automations, icon: 'bolt' }],
  },
  {
    label: 'Configure',
    items: [
      // Senders, signature, meeting/portfolio links, and compliance footer live here —
      // set once per workspace rather than re-entered per campaign.
      { label: 'Email settings', href: '/settings/email-marketing', icon: 'settings' },
    ],
  },
];

type MarketingSidebarProps = {
  variant?: 'list' | 'wizard';
  onNavigate?: () => void;
};

export function MarketingSidebar({ onNavigate }: MarketingSidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="h-screen w-64 border-r border-gray-200 bg-surface flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-headline-sm font-bold text-primary">FlowChat</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
          Campaign Manager
        </p>
      </div>

      <div className="px-3 pt-3">
        <Link
          href={CRM_HOME as Route}
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-primary-border bg-primary-surface text-primary font-semibold text-[13px] transition-colors hover:bg-primary-fixed hover:border-primary-fixed-dim"
        >
          <MarketingIcon name="arrow_back" className="text-[18px]" />
          <span>Back to CRM</span>
        </Link>
      </div>

      <ModuleSidebar sections={navSections} isActive={isActive} onNavigate={onNavigate} />
    </aside>
  );
}
