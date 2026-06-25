'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingCampaign } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { TabBar } from '@/components/ui/tabs';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'draft', label: 'Drafts' },
  { id: 'completed', label: 'Completed' },
] as const;

const statusColor: Record<string, 'success' | 'warning' | 'gray' | 'primary'> = {
  running: 'success',
  scheduled: 'warning',
  draft: 'gray',
  paused: 'warning',
  cancelled: 'gray',
  completed: 'primary',
};

function formatCampaignId(id: string) {
  return `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export default function CampaignsPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusTab, setStatusTab] = useState<string>('all');

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.campaigns
      .list(accountId, token)
      .then((r) => setCampaigns(r.campaigns))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, accountId]);

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'running' || c.status === 'scheduled').length;
    const drafts = campaigns.filter((c) => c.status === 'draft').length;
    const recipients = campaigns.reduce((n, c) => n + (c.recipientCount ?? 0), 0);
    return { total: campaigns.length, active, drafts, recipients };
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (statusTab === 'all') return campaigns;
    return campaigns.filter((c) => c.status === statusTab);
  }, [campaigns, statusTab]);

  const handleNewCampaign = async () => {
    if (!token || !accountId || creating) return;
    setCreating(true);
    try {
      const res = await api.marketing.campaigns.create(accountId, {}, token);
      router.push(
        `/dashboard/marketing/campaigns/${res.campaign.id}/edit?step=1` as Route
      );
    } catch {
      setCreating(false);
    }
  };

  const isEmpty = !loading && campaigns.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Campaigns"
        description="Multi-step email campaigns with explicit recipients"
        action={
          <Button type="button" onClick={handleNewCampaign} disabled={creating}>
            {creating ? 'Creating…' : '+ New campaign'}
          </Button>
        }
      />

      <div className="px-6 pb-4">
        <MetricGrid>
          <MetricCard label="Total campaigns" value={loading ? '—' : stats.total} accent="primary" />
          <MetricCard label="Active" value={stats.active} accent="accent" />
          <MetricCard label="Drafts" value={stats.drafts} accent="amber" />
          <MetricCard
            label="Total recipients"
            value={stats.recipients}
            hint="Across all campaigns"
          />
        </MetricGrid>
      </div>

      <div className="px-6 pb-6 flex-1 overflow-auto">
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gradient-to-br from-primary-50 to-teal-50 p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Create a multi-step email campaign, choose recipients, and launch when you are ready.
            </p>
            <Button type="button" onClick={handleNewCampaign} disabled={creating}>
              Create your first campaign
            </Button>
          </div>
        ) : (
          <>
            <TabBar tabs={[...STATUS_TABS]} active={statusTab} onChange={setStatusTab} />
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Recipients</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No campaigns in this view.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={
                              (c.status === 'draft'
                                ? `/dashboard/marketing/campaigns/${c.id}/edit?step=${c.currentStep}`
                                : `/dashboard/marketing/campaigns/${c.id}`) as Route
                            }
                            className="font-medium text-primary-600 hover:underline"
                          >
                            {c.name}
                          </Link>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">
                            {formatCampaignId(c.id)}
                          </p>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <Badge color={statusColor[c.status] ?? 'gray'}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.recipientCount}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={
                              (c.status === 'draft'
                                ? `/dashboard/marketing/campaigns/${c.id}/edit?step=${c.currentStep}`
                                : `/dashboard/marketing/campaigns/${c.id}`) as Route
                            }
                            className="text-xs text-primary-600 hover:underline"
                          >
                            {c.status === 'draft' ? 'Continue →' : 'View →'}
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
