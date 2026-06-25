'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingCampaign } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);

  useEffect(() => {
    if (!token || !accountId) return;
    api.marketing.campaigns.get(accountId, campaignId, token).then((r) => {
      if (r.campaign.status === 'draft') {
        router.replace(
          `/dashboard/marketing/campaigns/${campaignId}/edit?step=${r.campaign.currentStep}` as Route
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
    <div className="flex flex-col h-full min-h-0 animate-fade-in p-6 space-y-6">
      <div>
        <Link href={'/dashboard/marketing/campaigns' as Route} className="text-sm text-primary-600 hover:underline">
          ← Campaigns
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{campaign.name}</h1>
            <p className="text-xs text-gray-400 mt-1 capitalize flex items-center gap-2">
              <Badge>{campaign.status}</Badge>
              {campaign.recipientCount} recipients
            </p>
            {campaign.launchedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Launched {new Date(campaign.launchedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-sm text-gray-500">
        Campaign stats (overview, email steps, recipients, activity log) — Sprint 6M-7.
      </div>
    </div>
  );
}
