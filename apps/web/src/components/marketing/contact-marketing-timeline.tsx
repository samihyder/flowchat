'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { MarketingTimelineEvent } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingRoutes } from '@/lib/marketing/routes';

function eventIcon(eventType: string) {
  switch (eventType) {
    case 'clicked':
      return { name: 'ads_click', className: 'text-primary bg-primary-surface' };
    case 'opened':
      return { name: 'visibility', className: 'text-primary bg-primary-surface' };
    case 'stopped':
    case 'recipient_stop':
    case 'complaint':
      return { name: 'block', className: 'text-status-danger-text bg-status-danger-bg' };
    case 'step_sent':
    case 'sent':
      return { name: 'send', className: 'text-status-success-text bg-status-success-bg' };
    default:
      return { name: 'mail', className: 'text-gray-500 bg-gray-100' };
  }
}

function formatLabel(e: MarketingTimelineEvent) {
  if (e.eventType === 'stopped' && e.status) {
    return `Stopped — ${e.status.replace('stopped_', '').replace(/_/g, ' ')}`;
  }
  if (e.eventType === 'recipient_stop' && e.detail) {
    return `Stopped — ${e.detail}`;
  }
  return e.eventType.replace(/_/g, ' ');
}

type Props = {
  events: MarketingTimelineEvent[];
};

export function ContactMarketingTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
        No marketing campaign activity yet.
      </div>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Marketing Activity Timeline</h2>
        <span className="text-xs text-gray-400 font-label-caps uppercase">Campaign events only</span>
      </div>
      <ol className="relative border-l border-gray-200 ml-3 space-y-8">
        {events.map((e) => {
          const icon = eventIcon(e.eventType);
          return (
            <li key={e.id} className="ml-6">
              <span
                className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${icon.className}`}
              >
                <MarketingIcon name={icon.name} className="text-[14px]" />
              </span>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-on-surface capitalize">{formatLabel(e)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Link
                      href={marketingRoutes.campaign(e.campaignId) as Route}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-surface text-primary text-xs font-medium border border-primary-border/50 hover:bg-primary-surface/80"
                    >
                      <MarketingIcon name="campaign" className="text-[12px]" />
                      {e.campaignName}
                    </Link>
                    {e.stepOrder != null && (
                      <span className="text-xs font-data-mono text-gray-500">Step {e.stepOrder}</span>
                    )}
                  </div>
                  {e.subject && <p className="text-xs text-gray-500 mt-1">{e.subject}</p>}
                </div>
                <time className="text-xs font-data-mono text-gray-400 shrink-0">
                  {new Date(e.createdAt).toLocaleString()}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
