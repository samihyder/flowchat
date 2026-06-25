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
    <div className="md:hidden space-y-3">
      {campaigns.map((c) => {
        const href = (
          c.status === 'draft'
            ? marketingRoutes.campaignEdit(c.id, c.currentStep)
            : marketingRoutes.campaign(c.id)
        ) as Route;
        return (
          <article
            key={c.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={href} className="min-w-0 flex-1">
                <p className="font-body-lg text-body-lg text-on-surface font-semibold truncate">
                  {c.name}
                </p>
                <p className="text-xs font-data-mono text-gray-400 mt-0.5">
                  {formatCampaignId(c.id)}
                </p>
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
            <div className="flex items-center justify-between gap-2">
              <CampaignStatusBadge status={c.status} />
              <span className="text-xs text-gray-500">{c.recipientCount} recipients</span>
            </div>
            {c.status === 'draft' && (
              <div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${Math.min(100, c.currentStep * 25)}%` }}
                  />
                </div>
                <p className="text-[10px] mt-1 text-gray-500">Setup {c.currentStep * 25}% complete</p>
              </div>
            )}
            <Link
              href={href}
              className="text-sm text-primary font-medium inline-flex items-center gap-1"
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
