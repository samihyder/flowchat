'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useAuthStore } from '@/store/auth';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { initials } from '@/components/conversations/conversation-badges';

/**
 * Settings gear + signed-in user, shown top-right on every marketing page (list views and
 * the campaign builder alike) — the one place this lives, instead of duplicated per page.
 */
export function MarketingUserMenu() {
  const { user } = useAuthStore();

  return (
    <div className="flex items-center gap-3 shrink-0">
      <Link
        href={'/settings/email-marketing' as Route}
        className="p-2 text-on-surface-variant hover:bg-gray-50 rounded-full transition-colors"
        aria-label="Settings"
      >
        <MarketingIcon name="settings" />
      </Link>
      <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {initials(user?.name || user?.email || 'A')}
        </div>
        <div className="hidden md:block min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate leading-tight">
            {user?.name || 'Sales Agent'}
          </p>
          <p className="text-xs text-on-surface-variant truncate leading-tight">
            {user?.email || 'agent@flowchat.io'}
          </p>
        </div>
      </div>
    </div>
  );
}
