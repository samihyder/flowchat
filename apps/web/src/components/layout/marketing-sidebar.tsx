'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { ModuleSidebar, type ModuleNavSection } from '@/components/layout/module-sidebar';
import { initials } from '@/components/conversations/conversation-badges';

const CRM_HOME = '/dashboard/contacts' as const;

// Grouped and ordered the way a campaign gets built: send & monitor first,
// then the content/audience building blocks, then ongoing automation.
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
    items: [{ label: 'Workflows', href: marketingRoutes.workflows, icon: 'account_tree' }],
  },
];

type MarketingSidebarProps = {
  variant?: 'list' | 'wizard';
  onNavigate?: () => void;
};

export function MarketingSidebar({ variant = 'list', onNavigate }: MarketingSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, accountId } = useAuthStore();
  const [creating, setCreating] = useState(false);

  const isWizard = variant === 'wizard' || pathname.includes('/edit');

  const isActive = (href: string) => pathname.startsWith(href);

  const handleNewCampaign = async () => {
    if (!token || !accountId || creating) return;
    setCreating(true);
    try {
      const res = await api.marketing.campaigns.create(accountId, {}, token);
      onNavigate?.();
      router.push(marketingRoutes.campaignEdit(res.campaign.id, 1) as Route);
    } finally {
      setCreating(false);
    }
  };

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

      <div className={`mt-auto ${isWizard ? 'pt-4 border-t border-gray-100 px-3 pb-3' : 'border-t border-gray-200 pt-4 px-3 pb-3'}`}>
        {isWizard && (
          <button
            type="button"
            onClick={() => void handleNewCampaign()}
            disabled={creating}
            className="w-full marketing-btn-primary flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors mb-0 disabled:opacity-60"
          >
            <MarketingIcon name="add" />
            <span>{creating ? 'Creating…' : 'New Campaign'}</span>
          </button>
        )}
        <div className={`flex items-center gap-3 ${isWizard ? 'mt-6 px-1' : 'px-1'}`}>
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {initials(user?.name || user?.email || 'A')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'Sales Agent'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || 'agent@flowchat.io'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
