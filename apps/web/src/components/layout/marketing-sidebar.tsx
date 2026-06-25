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
] as const;

type MarketingSidebarProps = {
  onNavigate?: () => void;
};

export function MarketingSidebar({ onNavigate }: MarketingSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, accountId, clearAuth } = useAuthStore();
  const [creating, setCreating] = useState(false);

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
    <div className="flex flex-col h-full p-4">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold text-mkt-primary">FlowChat</h1>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
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
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'text-mkt-primary bg-mkt-primary-surface font-bold'
                  : 'text-mkt-on-surface-variant hover:bg-gray-50'
              }`}
            >
              <MarketingIcon name={item.icon} className="text-[22px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => void handleNewCampaign()}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-mkt-primary text-white font-bold hover:bg-mkt-primary-hover transition-colors text-sm disabled:opacity-60 shadow-sm"
        >
          <MarketingIcon name="add" className="text-[20px]" />
          {creating ? 'Creating…' : 'New Campaign'}
        </button>

        <Link
          href={'/dashboard' as Route}
          onClick={onNavigate}
          className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-mkt-primary transition-colors"
        >
          <MarketingIcon name="arrow_back" className="text-[16px]" />
          Back to Inbox
        </Link>

        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="w-10 h-10 rounded-full bg-mkt-primary-surface text-mkt-primary flex items-center justify-center text-sm font-bold shrink-0">
            {initials(user?.name || user?.email || 'A')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-gray-900">
              {user?.name || 'Agent'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAuth();
              router.push('/sign-in');
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            title="Sign out"
          >
            <MarketingIcon name="logout" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
