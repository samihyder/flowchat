'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingCampaign } from '@/lib/api';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingRoutes } from '@/lib/marketing/routes';

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const launched = searchParams.get('launched') === '1';

  useEffect(() => {
    if (!token || !accountId) return;
    api.marketing.campaigns.get(accountId, campaignId, token).then((r) => {
      if (r.campaign.status === 'draft') {
        router.replace(
          `/marketing/campaigns/${campaignId}/edit?step=${r.campaign.currentStep}` as Route
        );
        return;
      }
      setCampaign(r.campaign);
    });
  }, [accountId, campaignId, router, token]);

  if (!campaign) {
    return <div className="p-8 text-sm text-gray-400">Loading campaign…</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-8 max-w-container-max-list mx-auto w-full space-y-6">
      {launched && (
        <div className="rounded-xl border border-status-success-bg bg-status-success-bg/50 px-4 py-3 text-sm text-status-success-text flex items-start gap-2">
          <MarketingIcon name="check_circle" className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Campaign launched successfully</p>
            <p className="text-xs mt-0.5 opacity-90">
              Your campaign is now {campaign.status}. Stats and activity will appear here as sends
              process.
            </p>
          </div>
        </div>
      )}

      <div>
        <Link
          href={marketingRoutes.campaigns as Route}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          <MarketingIcon name="arrow_back" className="text-[18px]" />
          Campaigns
        </Link>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <h1 className="text-headline-md text-on-surface">{campaign.name}</h1>
            <p className="text-sm text-on-surface-variant mt-2 flex items-center gap-2 flex-wrap">
              <CampaignStatusBadge status={campaign.status} />
              <span>{campaign.recipientCount} recipients</span>
            </p>
            {campaign.launchedAt && (
              <p className="text-xs text-gray-500 mt-1 font-data-mono">
                Launched {new Date(campaign.launchedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-on-surface-variant">
        <MarketingIcon name="analytics" className="text-[40px] text-gray-300 mx-auto mb-3" />
        <p className="font-medium text-on-surface mb-1">Campaign stats coming in Sprint 6M-7</p>
        <p>Overview, email steps, recipients, and activity log will appear here.</p>
      </div>
    </div>
  );
}
