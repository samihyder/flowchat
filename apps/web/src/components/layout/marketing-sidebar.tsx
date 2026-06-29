'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { initials } from '@/components/conversations/conversation-badges';

const navItems = [
  { label: 'Campaigns', href: marketingRoutes.campaigns, icon: 'mail' },
  { label: 'Templates', href: marketingRoutes.templates, icon: 'description' },
  { label: 'Segments', href: marketingRoutes.segments, icon: 'groups' },
] as const;

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

  const isActive = (href: string) => {
    if (href === marketingRoutes.campaigns) {
      return pathname.startsWith(marketingRoutes.campaigns);
    }
    return pathname.startsWith(href);
  };

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
    <aside className="h-full w-64 border-r border-gray-200 bg-surface flex flex-col p-4">
      <div className="mb-8 px-4">
        <h1 className="text-headline-sm font-bold text-primary">FlowChat</h1>
        <p className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold">
          Campaign Manager
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                active
                  ? 'text-primary bg-primary-surface font-bold'
                  : 'text-on-surface-variant hover:bg-gray-50'
              }`}
            >
              <MarketingIcon name={item.icon} />
              <span className="text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto ${isWizard ? 'pt-4 border-t border-gray-100' : 'border-t border-gray-200 pt-4 px-2'}`}>
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
        <div className={`flex items-center gap-3 ${isWizard ? 'mt-6 px-4' : 'px-2'}`}>
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
