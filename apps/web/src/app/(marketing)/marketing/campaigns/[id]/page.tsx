'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  api,
  type CampaignControlPreview,
  type CampaignStatsResult,
  type MarketingCampaign,
} from '@/lib/api';
import { CampaignControlModal } from '@/components/marketing/campaign-control-modal';
import { CampaignStatsView } from '@/components/marketing/campaign-stats-view';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingRoutes } from '@/lib/marketing/routes';

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { token, accountId } = useAuthStore();
  const launched = searchParams.get('launched') === '1';

  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [stats, setStats] = useState<CampaignStatsResult | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [controlAction, setControlAction] = useState<'pause' | 'cancel'>('pause');
  const [controlPreview, setControlPreview] = useState<CampaignControlPreview | null>(null);
  const [controlBusy, setControlBusy] = useState(false);

  const load = useCallback(() => {
    if (!token || !accountId) return;
    setLoading(true);
    Promise.all([
      api.marketing.campaigns.get(accountId, campaignId, token),
      api.marketing.campaigns.getStats(accountId, campaignId, token).catch(() => null),
      api.contacts.access(accountId, token),
    ])
      .then(([campaignRes, statsRes, accessRes]) => {
        if (campaignRes.campaign.status === 'draft') {
          router.replace(
            marketingRoutes.campaignEdit(campaignId, campaignRes.campaign.currentStep) as Route
          );
          return;
        }
        setCampaign(campaignRes.campaign);
        setStats(statsRes);
        setIsAdmin(accessRes.isAdmin);
      })
      .finally(() => setLoading(false));
  }, [accountId, campaignId, router, token]);

  useEffect(load, [load]);

  const openControl = async (action: 'pause' | 'cancel') => {
    if (!token || !accountId) return;
    setControlAction(action);
    try {
      const res = await api.marketing.campaigns.getControlPreview(accountId, campaignId, token);
      setControlPreview(res.preview);
    } catch {
      setControlPreview(null);
    }
    setControlOpen(true);
  };

  const handleControl = async (action: 'pause' | 'cancel') => {
    if (!token || !accountId) return;
    setControlBusy(true);
    try {
      await api.marketing.campaigns.control(accountId, campaignId, action, token);
      setControlOpen(false);
      load();
    } finally {
      setControlBusy(false);
    }
  };

  const handleResume = async () => {
    if (!token || !accountId) return;
    await api.marketing.campaigns.control(accountId, campaignId, 'resume', token);
    load();
  };

  const handleExport = async () => {
    if (!token || !accountId) return;
    setExporting(true);
    try {
      const csv = await api.marketing.campaigns.exportCsv(accountId, campaignId, token);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaignId.slice(0, 8)}-recipients.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !campaign) {
    return <div className="p-8 text-sm text-gray-400">Loading campaign…</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full space-y-6">
      {launched && (
        <div className="rounded-xl border border-status-success-bg bg-status-success-bg/50 px-4 py-3 text-sm text-status-success-text flex items-start gap-2">
          <MarketingIcon name="check_circle" className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Campaign launched successfully</p>
            <p className="text-xs mt-0.5 opacity-90">
              Your campaign is now {campaign.status}. Stats update as sends process.
            </p>
          </div>
        </div>
      )}

      <Link
        href={marketingRoutes.campaigns as Route}
        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
      >
        <MarketingIcon name="arrow_back" className="text-[18px]" />
        Campaigns
      </Link>

      <CampaignStatsView
        campaign={campaign}
        stats={stats}
        loading={loading}
        isAdmin={isAdmin}
        onPause={() => void openControl('pause')}
        onResume={isAdmin ? () => void handleResume() : undefined}
        onCancel={() => void openControl('cancel')}
        onExport={() => void handleExport()}
        exporting={exporting}
      />

      <CampaignControlModal
        open={controlOpen}
        campaign={campaign}
        preview={controlPreview}
        loading={controlBusy}
        initialAction={controlAction}
        onClose={() => setControlOpen(false)}
        onConfirm={(action) => void handleControl(action)}
      />
      </div>
    </div>
  );
}
