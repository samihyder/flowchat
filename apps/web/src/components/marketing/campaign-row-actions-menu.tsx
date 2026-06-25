'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useRef, useState } from 'react';
import type { MarketingCampaign } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingRoutes } from '@/lib/marketing/routes';

type Props = {
  campaign: MarketingCampaign;
  isAdmin: boolean;
  onDuplicate: (campaign: MarketingCampaign) => void;
  onPause: (campaign: MarketingCampaign) => void;
  onCancel: (campaign: MarketingCampaign) => void;
  onResume: (campaign: MarketingCampaign) => void;
  busy?: boolean;
};

export function CampaignRowActionsMenu({
  campaign,
  isAdmin,
  onDuplicate,
  onPause,
  onCancel,
  onResume,
  busy,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const isDraft = campaign.status === 'draft';
  const canPause =
    isAdmin && (campaign.status === 'running' || campaign.status === 'scheduled');
  const canCancel =
    isAdmin &&
    campaign.status !== 'draft' &&
    campaign.status !== 'completed' &&
    campaign.status !== 'cancelled';
  const canResume = isAdmin && campaign.status === 'paused';

  const viewHref = isDraft
    ? marketingRoutes.campaignEdit(campaign.id, campaign.currentStep)
    : marketingRoutes.campaign(campaign.id);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={`p-1 rounded transition-colors inline-flex ${
          open
            ? 'bg-white border border-gray-200 text-primary shadow-sm ring-2 ring-primary-border'
            : 'text-gray-400 hover:text-primary hover:bg-gray-100'
        }`}
        aria-label="Campaign actions"
        aria-expanded={open}
      >
        <MarketingIcon name="more_vert" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {!isDraft && (
              <Link
                href={viewHref as Route}
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-gray-50 text-body-md transition-colors"
              >
                <MarketingIcon name="bar_chart" className="text-gray-400" />
                View stats
              </Link>
            )}
            {isDraft && (
              <Link
                href={viewHref as Route}
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-gray-50 text-body-md transition-colors"
              >
                <MarketingIcon name="edit" className="text-gray-400" />
                Edit draft
              </Link>
            )}
            <div className="px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDuplicate(campaign);
                }}
                disabled={busy}
                className="w-full flex items-center gap-3 px-3 py-2 text-primary font-bold bg-primary-surface rounded-lg text-body-md transition-colors border border-primary-border/50 hover:bg-primary-surface/80 disabled:opacity-60"
              >
                <MarketingIcon name="content_copy" />
                Duplicate
              </button>
            </div>
            {canResume && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onResume(campaign);
                }}
                disabled={busy}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-gray-50 text-body-md transition-colors disabled:opacity-60"
              >
                <MarketingIcon name="play_circle" className="text-gray-400" />
                Resume
              </button>
            )}
            {canPause && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPause(campaign);
                }}
                disabled={busy}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-gray-50 text-body-md transition-colors disabled:opacity-60"
              >
                <MarketingIcon name="pause_circle" className="text-gray-400" />
                Pause
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCancel(campaign);
                }}
                disabled={busy}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-status-danger-text hover:bg-status-danger-bg text-body-md transition-colors disabled:opacity-60"
              >
                <MarketingIcon name="cancel" />
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
