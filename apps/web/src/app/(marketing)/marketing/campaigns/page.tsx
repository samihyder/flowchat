'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingCampaign } from '@/lib/api';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingMetricCard, MarketingMetricGrid } from '@/components/marketing/ui/marketing-metric-card';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

const STATUS_TABS = [
  { id: 'all', label: 'All Campaigns' },
  { id: 'draft', label: 'Drafts' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'paused', label: 'Paused' },
  { id: 'scheduled', label: 'Scheduled' },
] as const;

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
  const [tableFilter, setTableFilter] = useState('');

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
    const scheduled = campaigns.filter((c) => c.status === 'scheduled').length;
    const drafts = campaigns.filter((c) => c.status === 'draft').length;
    const recipients = campaigns.reduce((n, c) => n + (c.recipientCount ?? 0), 0);
    return { total: campaigns.length, active, scheduled, drafts, recipients };
  }, [campaigns]);

  const filtered = useMemo(() => {
    let rows = campaigns;
    if (statusTab !== 'all') {
      rows = rows.filter((c) => c.status === statusTab);
    }
    const q = tableFilter.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          formatCampaignId(c.id).toLowerCase().includes(q)
      );
    }
    return rows;
  }, [campaigns, statusTab, tableFilter]);

  const handleNewCampaign = async () => {
    if (!token || !accountId || creating) return;
    setCreating(true);
    try {
      const res = await api.marketing.campaigns.create(accountId, {}, token);
      router.push(
        `/marketing/campaigns/${res.campaign.id}/edit?step=1` as Route
      );
    } catch {
      setCreating(false);
    }
  };

  const isEmpty = !loading && campaigns.length === 0;

  const campaignHref = (c: MarketingCampaign): Route =>
    (c.status === 'draft'
      ? `/marketing/campaigns/${c.id}/edit?step=${c.currentStep}`
      : `/marketing/campaigns/${c.id}`) as Route;

  return (
    <div className="flex flex-col h-full min-h-0">
      <MarketingPageHeader
        title="Campaigns"
        search={
          <div className="relative hidden sm:block">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <MarketingIcon name="search" className="text-[20px]" />
            </span>
            <input
              type="search"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Search campaigns..."
              className="block w-48 lg:w-64 pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-mkt-primary-border focus:border-mkt-primary text-sm"
            />
          </div>
        }
        action={
          <button
            type="button"
            onClick={() => void handleNewCampaign()}
            disabled={creating}
            className="bg-mkt-primary hover:bg-mkt-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm text-sm disabled:opacity-60"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            {creating ? 'Creating…' : 'New Campaign'}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 lg:p-8 max-w-[1280px] w-full mx-auto space-y-8">
        {!isEmpty && (
          <MarketingMetricGrid>
            <MarketingMetricCard label="Total Campaigns" value={loading ? '—' : stats.total} />
            <MarketingMetricCard
              label="Active"
              value={stats.active}
              variant="active"
              hint={
                stats.total > 0 ? (
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                    <div
                      className="bg-mkt-primary h-1.5 rounded-full"
                      style={{ width: `${Math.round((stats.active / stats.total) * 100)}%` }}
                    />
                  </div>
                ) : null
              }
            />
            <MarketingMetricCard
              label="Scheduled"
              value={stats.scheduled}
              hint={stats.scheduled > 0 ? 'Upcoming sends' : 'No scheduled campaigns'}
            />
            <MarketingMetricCard
              label="Total Recipients"
              value={stats.recipients.toLocaleString()}
              variant="accent"
              hint="Across all campaigns"
            />
          </MarketingMetricGrid>
        )}

        {isEmpty ? (
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center max-w-lg mx-auto mt-12">
            <div className="w-14 h-14 rounded-full bg-mkt-primary-surface text-mkt-primary flex items-center justify-center mx-auto mb-4">
              <MarketingIcon name="campaign" className="text-[28px]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h2>
            <p className="text-sm text-gray-500 mb-6">
              Create a multi-step email campaign, choose recipients, and launch when you are ready.
            </p>
            <button
              type="button"
              onClick={() => void handleNewCampaign()}
              disabled={creating}
              className="bg-mkt-primary hover:bg-mkt-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60"
            >
              Create your first campaign
            </button>
          </section>
        ) : (
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 lg:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusTab(tab.id)}
                    className={`text-sm font-medium whitespace-nowrap transition-colors pb-0.5 ${
                      statusTab === tab.id
                        ? 'text-mkt-primary border-b-2 border-mkt-primary'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <MarketingIcon name="search" className="text-[18px]" />
                  </span>
                  <input
                    type="search"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Filter table..."
                    className="block w-40 sm:w-48 pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-mkt-primary-border focus:border-mkt-primary text-xs"
                  />
                </div>
                <button type="button" className="text-gray-400 hover:text-gray-600 p-1" aria-label="Filter">
                  <MarketingIcon name="filter_list" className="text-[22px]" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign Name
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-4 lg:px-6 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                        Loading campaigns…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                        No campaigns match this view.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-4 lg:px-6 py-4">
                          <Link href={campaignHref(c)} className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-mkt-primary">
                              {c.name}
                            </span>
                            <span
                              className="text-xs text-gray-400 mt-0.5"
                              style={{ fontFamily: 'var(--font-mkt-mono)' }}
                            >
                              ID: {formatCampaignId(c.id)}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-center">
                          <CampaignStatusBadge status={c.status} />
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-700">
                          {c.recipientCount ?? 0}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex flex-col text-sm text-gray-700" style={{ fontFamily: 'var(--font-mkt-mono)' }}>
                            <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(c.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right">
                          <Link
                            href={campaignHref(c)}
                            className="p-1 text-gray-400 hover:text-mkt-primary transition-colors inline-flex"
                            aria-label={c.status === 'draft' ? 'Continue campaign' : 'View campaign'}
                          >
                            <MarketingIcon name="more_vert" className="text-[22px]" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
