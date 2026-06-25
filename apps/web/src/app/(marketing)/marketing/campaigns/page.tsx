'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingCampaign } from '@/lib/api';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingMetricCard, MarketingMetricGrid } from '@/components/marketing/ui/marketing-metric-card';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';
import { marketingRoutes } from '@/lib/marketing/routes';

const STATUS_TABS = [
  { id: 'all', label: 'All Campaigns' },
  { id: 'draft', label: 'Drafts' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'paused', label: 'Paused' },
] as const;

const PAGE_SIZE = 5;

function formatCampaignId(id: string) {
  return `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function formatNextSend(c: MarketingCampaign) {
  if (c.status === 'draft') {
    return <span className="text-sm text-gray-400 italic">Not scheduled</span>;
  }
  if (c.status === 'completed' || c.status === 'cancelled') {
    const d = c.launchedAt ?? c.updatedAt;
    return (
      <span className="text-sm text-gray-400 italic">
        Finished {new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    );
  }
  const d = c.launchedAt ?? c.updatedAt;
  const date = new Date(d);
  const isScheduled = c.status === 'scheduled';
  return (
    <div
      className={`flex flex-col text-sm font-data-mono ${
        isScheduled ? 'text-primary font-semibold' : 'text-gray-700'
      }`}
    >
      <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      <span className={`text-xs ${isScheduled ? '' : 'text-gray-400'}`}>
        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusTab, setStatusTab] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

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
    const recipients = campaigns.reduce((n, c) => n + (c.recipientCount ?? 0), 0);
    return { total: campaigns.length, active, scheduled, recipients };
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [statusTab, tableFilter]);

  const toggleRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(paged.map((c) => c.id)));
    else setSelectedIds(new Set());
  };

  const handleNewCampaign = async () => {
    if (!token || !accountId || creating) return;
    setCreating(true);
    try {
      const res = await api.marketing.campaigns.create(accountId, {}, token);
      router.push(marketingRoutes.campaignEdit(res.campaign.id, 1) as Route);
    } catch {
      setCreating(false);
    }
  };

  const isEmpty = !loading && campaigns.length === 0;

  const campaignHref = (c: MarketingCampaign): Route =>
    (c.status === 'draft'
      ? marketingRoutes.campaignEdit(c.id, c.currentStep)
      : marketingRoutes.campaign(c.id)) as Route;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader
        title="Campaigns"
        search={
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <MarketingIcon name="search" className="text-[20px]" />
            </span>
            <input
              type="search"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Search campaigns..."
              className="block w-64 pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-border focus:border-primary text-sm"
            />
          </div>
        }
        action={
          <button
            type="button"
            onClick={() => void handleNewCampaign()}
            disabled={creating}
            className="bg-brand-indigo hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
          >
            <MarketingIcon name="add" />
            {creating ? 'Creating…' : 'New Campaign'}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-8 max-w-container-max-list mx-auto w-full space-y-8">
        {!isEmpty && (
          <MarketingMetricGrid>
            <MarketingMetricCard label="Total Campaigns" value={loading ? '—' : stats.total} />
            <MarketingMetricCard
              label="Active"
              value={stats.active}
              variant="active"
              hint={
                stats.total > 0 ? (
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-4">
                    <div
                      className="bg-primary h-1.5 rounded-full"
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
          <section className="relative min-h-[500px] rounded-3xl overflow-hidden flex items-center justify-center p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] to-[#F0FDFA] opacity-70" />
            <div className="relative z-10 text-center max-w-lg">
              <div className="mb-8 relative inline-block">
                <div className="w-32 h-32 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto ring-1 ring-gray-100 rotate-3">
                  <MarketingIcon name="mail" className="text-5xl text-primary/40" />
                </div>
              </div>
              <h3 className="text-headline-md text-on-surface mb-3">No campaigns yet</h3>
              <p className="text-gray-600 text-body-lg mb-10 leading-relaxed">
                Create a multi-step email campaign to engage your leads on autopilot. Connect your CRM,
                design your flow, and watch your conversion rates grow.
              </p>
              <button
                type="button"
                onClick={() => void handleNewCampaign()}
                disabled={creating}
                className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-primary-hover transition-all disabled:opacity-60"
              >
                Create your first campaign
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusTab(tab.id)}
                    className={`text-sm font-medium whitespace-nowrap transition-colors pb-0.5 ${
                      statusTab === tab.id
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative mr-4">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <MarketingIcon name="search" className="text-[18px]" />
                  </span>
                  <input
                    type="search"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Filter table..."
                    className="block w-48 pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary-border focus:border-primary text-xs"
                  />
                </div>
                <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="Filter">
                  <MarketingIcon name="filter_list" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        checked={paged.length > 0 && paged.every((c) => selectedIds.has(c.id))}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-6 py-3 text-label-caps text-gray-500 uppercase tracking-wider">
                      Campaign Name
                    </th>
                    <th className="px-6 py-3 text-label-caps text-gray-500 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-6 py-3 text-label-caps text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-label-caps text-gray-500 uppercase tracking-wider">
                      Next Send
                    </th>
                    <th className="px-6 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                        Loading campaigns…
                      </td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                        No campaigns match this view.
                      </td>
                    </tr>
                  ) : (
                    paged.map((c) => {
                      const checked = selectedIds.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-gray-50 transition-colors group ${checked ? 'bg-primary-surface' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              checked={checked}
                              onChange={(e) => toggleRow(c.id, e.target.checked)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <Link href={campaignHref(c)} className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900 group-hover:text-primary">
                                {c.name}
                              </span>
                              <span className="font-data-mono text-xs text-gray-400">
                                ID: {formatCampaignId(c.id)}
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <CampaignStatusBadge status={c.status} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{c.recipientCount ?? 0}</td>
                          <td className="px-6 py-4">{formatNextSend(c)}</td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={campaignHref(c)}
                              className="p-1 text-gray-400 hover:text-primary transition-colors inline-flex"
                              aria-label={c.status === 'draft' ? 'Continue campaign' : 'View campaign'}
                            >
                              <MarketingIcon name="more_vert" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {filtered.length === 0
                  ? 'No campaigns'
                  : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} campaigns`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 border border-gray-200 rounded bg-white text-gray-400 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <MarketingIcon name="chevron_left" className="text-[18px]" />
                </button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      page === n
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="p-2 border border-gray-200 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <MarketingIcon name="chevron_right" className="text-[18px]" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <MarketingListFooter />
    </div>
  );
}
