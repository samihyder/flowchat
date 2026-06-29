'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type CampaignControlPreview, type MarketingCampaign } from '@/lib/api';
import { CampaignControlModal } from '@/components/marketing/campaign-control-modal';
import { CampaignMobileList } from '@/components/marketing/campaign-mobile-list';
import { CampaignRowActionsMenu } from '@/components/marketing/campaign-row-actions-menu';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingMetricCard, MarketingMetricGrid } from '@/components/marketing/ui/marketing-metric-card';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';
import { marketingRoutes } from '@/lib/marketing/routes';

import { formatInTimezone, timezoneShortLabel } from '@/lib/timezone';

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
    if (c.firstSendAt) {
      const tz = c.scheduleTimezone || 'UTC';
      return (
        <div className="flex flex-col text-sm font-data-mono text-gray-700">
          <span>{formatInTimezone(c.firstSendAt, tz, 'en', { dateStyle: 'medium', timeStyle: undefined })}</span>
          <span className="text-xs text-gray-400">
            {formatInTimezone(c.firstSendAt, tz, 'en', { dateStyle: undefined, timeStyle: 'short' })} {timezoneShortLabel(tz)}
          </span>
        </div>
      );
    }
    return <span className="text-sm text-gray-400 italic">Not scheduled</span>;
  }
  if (c.status === 'completed' || c.status === 'cancelled') {
    const d = c.launchedAt ?? c.updatedAt;
    const tz = c.scheduleTimezone || 'UTC';
    return (
      <span className="text-sm text-gray-400 italic">
        Finished {formatInTimezone(d, tz, 'en', { dateStyle: 'medium', timeStyle: undefined })}
      </span>
    );
  }
  const d = c.nextScheduledAt ?? c.firstSendAt ?? c.launchedAt ?? c.updatedAt;
  const tz = c.scheduleTimezone || 'UTC';
  const isScheduled = c.status === 'scheduled' || Boolean(c.nextScheduledAt);
  return (
    <div
      className={`flex flex-col text-sm font-data-mono ${
        isScheduled ? 'text-primary font-semibold' : 'text-gray-700'
      }`}
    >
      <span>{formatInTimezone(d, tz, 'en', { dateStyle: 'medium', timeStyle: undefined })}</span>
      <span className={`text-xs ${isScheduled ? '' : 'text-gray-400'}`}>
        {formatInTimezone(d, tz, 'en', { dateStyle: undefined, timeStyle: 'short' })} {timezoneShortLabel(tz)}
      </span>
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    recipients: 0,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusTab, setStatusTab] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [controlCampaign, setControlCampaign] = useState<MarketingCampaign | null>(null);
  const [controlPreview, setControlPreview] = useState<CampaignControlPreview | null>(null);
  const [controlAction, setControlAction] = useState<'pause' | 'cancel'>('pause');
  const [controlOpen, setControlOpen] = useState(false);

  const load = () => {
    if (!token || !accountId) return;
    setLoading(true);
    Promise.all([
      api.marketing.campaigns.list(accountId, token, {
        page,
        pageSize: PAGE_SIZE,
        status: statusTab,
        q: tableFilter.trim() || undefined,
      }),
      api.contacts.access(accountId, token),
    ])
      .then(([listRes, accessRes]) => {
        setCampaigns(listRes.campaigns);
        setListTotal(listRes.total);
        setSummary(listRes.summary);
        setIsAdmin(accessRes.isAdmin);
      })
      .catch(() => {
        setCampaigns([]);
        setListTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, accountId, page, statusTab, tableFilter]);

  const stats = summary;

  const filtered = campaigns;
  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const paged = filtered;

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

  const isEmpty = !loading && summary.total === 0 && statusTab === 'all' && !tableFilter.trim();

  const campaignHref = (c: MarketingCampaign): Route =>
    (c.status === 'draft'
      ? marketingRoutes.campaignEdit(c.id, c.currentStep)
      : marketingRoutes.campaign(c.id)) as Route;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  const openControl = async (c: MarketingCampaign, action: 'pause' | 'cancel') => {
    if (!token || !accountId) return;
    setControlCampaign(c);
    setControlAction(action);
    try {
      const res = await api.marketing.campaigns.getControlPreview(accountId, c.id, token);
      setControlPreview(res.preview);
    } catch {
      setControlPreview(null);
    }
    setControlOpen(true);
  };

  const handleControlConfirm = async (action: 'pause' | 'cancel') => {
    if (!token || !accountId || !controlCampaign) return;
    setActionBusy(true);
    try {
      await api.marketing.campaigns.control(accountId, controlCampaign.id, action, token);
      setControlOpen(false);
      showToast(action === 'pause' ? 'Campaign paused.' : 'Campaign cancelled.');
      load();
    } finally {
      setActionBusy(false);
    }
  };

  const handleDuplicate = async (c: MarketingCampaign) => {
    if (!token || !accountId) return;
    setActionBusy(true);
    try {
      const res = await api.marketing.campaigns.duplicate(accountId, c.id, token);
      showToast(`Duplicated as "${res.campaign.name}"`);
      router.push(marketingRoutes.campaignEdit(res.campaign.id, 2) as Route);
    } catch {
      showToast('Could not duplicate campaign.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResume = async (c: MarketingCampaign) => {
    if (!token || !accountId) return;
    setActionBusy(true);
    try {
      await api.marketing.campaigns.control(accountId, c.id, 'resume', token);
      showToast('Campaign resumed.');
      load();
    } finally {
      setActionBusy(false);
    }
  };

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
            className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
          >
            <MarketingIcon name="add" />
            {creating ? 'Creating…' : 'New Campaign'}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full space-y-8">
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
                className="marketing-btn-primary px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-60"
              >
                Create your first campaign
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="md:hidden">
              <CampaignMobileList
                campaigns={paged}
                isAdmin={isAdmin}
                actionBusy={actionBusy}
                onDuplicate={(c) => void handleDuplicate(c)}
                onPause={(c) => void openControl(c, 'pause')}
                onCancel={(c) => void openControl(c, 'cancel')}
                onResume={(c) => void handleResume(c)}
              />
            </div>
          <section className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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
                    <th className="px-6 py-3 text-label-caps text-gray-500 uppercase tracking-wider text-center">
                      Steps
                    </th>
                    <th className="px-6 py-3 text-label-caps text-gray-500 uppercase tracking-wider">
                      Created by
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
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
                        Loading campaigns…
                      </td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
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
                          <td className="px-6 py-4 text-center text-sm text-gray-700">
                            {c.stepCount ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {c.createdByName ?? '—'}
                          </td>
                          <td className="px-6 py-4">{formatNextSend(c)}</td>
                          <td className="px-6 py-4 text-right">
                            <CampaignRowActionsMenu
                              campaign={c}
                              isAdmin={isAdmin}
                              busy={actionBusy}
                              onDuplicate={(campaign) => void handleDuplicate(campaign)}
                              onPause={(campaign) => void openControl(campaign, 'pause')}
                              onCancel={(campaign) => void openControl(campaign, 'cancel')}
                              onResume={(campaign) => void handleResume(campaign)}
                            />
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
                {listTotal === 0
                  ? 'No campaigns'
                  : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, listTotal)} of ${listTotal} campaigns`}
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
          </>
        )}
      </div>

      <MarketingListFooter />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 max-w-sm">
          <MarketingIcon name="check_circle" className="text-status-success-text" />
          {toast}
        </div>
      )}

      <CampaignControlModal
        open={controlOpen}
        campaign={controlCampaign}
        preview={controlPreview}
        loading={actionBusy}
        initialAction={controlAction}
        onClose={() => setControlOpen(false)}
        onConfirm={(action) => void handleControlConfirm(action)}
      />
    </div>
  );
}
