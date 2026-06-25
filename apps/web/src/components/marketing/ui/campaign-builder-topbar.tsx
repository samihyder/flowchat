'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingRoutes } from '@/lib/marketing/routes';

type CampaignBuilderTopBarProps = {
  onLaunch?: () => void;
  launchDisabled?: boolean;
};

export function CampaignBuilderTopBar({ onLaunch, launchDisabled }: CampaignBuilderTopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex justify-between items-center h-16 px-8 bg-surface border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-headline-sm font-bold text-primary">Campaign Builder</span>
        <div className="h-4 w-px bg-gray-300 mx-2" />
        <nav className="hidden md:flex gap-6">
          <Link
            href={marketingRoutes.campaigns as Route}
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            Drafts
          </Link>
          <span className="text-on-surface-variant text-sm opacity-60">Scheduled</span>
          <span className="text-on-surface-variant text-sm opacity-60">Sent</span>
        </nav>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block">
          <MarketingIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
          />
          <input
            type="search"
            placeholder="Global search..."
            className="pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary-border focus:outline-none"
            readOnly
            aria-label="Global search"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="p-2 text-on-surface-variant hover:bg-gray-50 rounded-full transition-colors"
            aria-label="Notifications"
          >
            <MarketingIcon name="notifications" />
          </button>
          <Link
            href={'/settings/email-marketing' as Route}
            className="p-2 text-on-surface-variant hover:bg-gray-50 rounded-full transition-colors"
            aria-label="Settings"
          >
            <MarketingIcon name="settings" />
          </Link>
          {onLaunch ? (
            <button
              type="button"
              onClick={onLaunch}
              disabled={launchDisabled}
              className="bg-primary text-on-primary px-6 py-1.5 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              Launch
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
