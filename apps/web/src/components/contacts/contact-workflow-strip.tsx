'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { marketingRoutes } from '@/lib/marketing/routes';

const items = [
  { href: marketingRoutes.campaigns, icon: '📧', label: 'Campaigns', hint: 'Reach contacts at scale' },
  { href: marketingRoutes.segments, icon: '👥', label: 'Segments', hint: 'Group for targeting' },
  { href: '/settings/email-marketing' as Route, icon: '⚡', label: 'Automations', hint: 'Sequence emails' },
] as const;

export function ContactWorkflowStrip() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          className="group flex items-start gap-3 rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/90 to-white px-4 py-3 hover:border-primary-200 hover:shadow-sm transition-all"
        >
          <span className="text-xl leading-none mt-0.5" aria-hidden>
            {item.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700">{item.label}</p>
            <p className="text-xs text-gray-500">{item.hint}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
