'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { MarketingCampaign } from '@/lib/api';
import { CampaignRowActionsMenu } from '@/components/marketing/campaign-row-actions-menu';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingRoutes } from '@/lib/marketing/routes';

function formatCampaignId(id: string) {
  return `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

type Props = {
  campaigns: MarketingCampaign[];
  isAdmin: boolean;
  actionBusy?: boolean;
  onDuplicate: (c: MarketingCampaign) => void;
  onPause: (c: MarketingCampaign) => void;
  onCancel: (c: MarketingCampaign) => void;
  onResume: (c: MarketingCampaign) => void;
};

export function CampaignMobileList({
  campaigns,
  isAdmin,
  actionBusy,
  onDuplicate,
  onPause,
  onCancel,
  onResume,
}: Props) {
  return (
    <div className="md:hidden space-y-4">
      <p className="text-label-caps text-gray-400 uppercase flex items-center justify-center gap-1 py-1">
        <MarketingIcon name="sync" className="text-[14px]" />
        Campaign list
      </p>
      {campaigns.map((c, i) => {
        const href = (
          c.status === 'draft'
            ? marketingRoutes.campaignEdit(c.id, c.currentStep)
            : marketingRoutes.campaign(c.id)
        ) as Route;
        return (
          <article
            key={c.id}
            className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-primary-border transition-all duration-200 flex flex-col gap-4 animate-marketing-stagger-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={href} className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-headline-sm text-on-surface font-semibold truncate">
                    {c.name}
                  </h3>
                  <CampaignStatusBadge status={c.status} />
                </div>
                <p className="text-xs font-data-mono text-gray-400">{formatCampaignId(c.id)}</p>
              </Link>
              <CampaignRowActionsMenu
                campaign={c}
                isAdmin={isAdmin}
                busy={actionBusy}
                onDuplicate={onDuplicate}
                onPause={onPause}
                onCancel={onCancel}
                onResume={onResume}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <MarketingIcon name="group" className="text-gray-400 text-[18px]" />
                <span className="font-data-mono">{c.recipientCount ?? 0} Recipients</span>
              </div>
              {c.status === 'draft' && (
                <div className="flex items-center gap-1.5 text-primary">
                  <MarketingIcon name="edit_note" className="text-[18px]" />
                  <span className="font-data-mono">Step {c.currentStep}/4</span>
                </div>
              )}
            </div>

            {c.status === 'draft' && (
              <div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, c.currentStep * 25)}%` }}
                  />
                </div>
                <p className="text-[10px] mt-1 text-on-surface-variant text-label-caps uppercase">
                  Setup {c.currentStep * 25}% complete
                </p>
              </div>
            )}

            <Link
              href={href}
              className="text-sm text-primary font-semibold inline-flex items-center gap-1 hover:underline"
            >
              {c.status === 'draft' ? 'Continue setup' : 'View stats'}
              <MarketingIcon name="chevron_right" className="text-[18px]" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
