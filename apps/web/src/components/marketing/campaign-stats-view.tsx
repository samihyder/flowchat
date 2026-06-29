'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Fragment, useMemo, useState } from 'react';
import type {
  CampaignStatsResult,
  MarketingCampaign,
} from '@/lib/api';
import { scheduleModeLabel } from '@/lib/marketing/campaign-schedule-time';
import { formatInTimezone, timezoneShortLabel } from '@/lib/timezone';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

type Tab = 'overview' | 'steps' | 'recipients' | 'activity';

type Props = {
  campaign: MarketingCampaign;
  stats: CampaignStatsResult | null;
  loading?: boolean;
  isAdmin: boolean;
  onPause: () => void;
  onResume?: () => void;
  onCancel: () => void;
  onExport: () => void;
  onProcessDue?: () => Promise<void>;
  processingDue?: boolean;
  exporting?: boolean;
};

function pct(part: number, total: number) {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function recipientStatusLabel(r: CampaignStatsResult['recipients'][0]) {
  const stopped = r.stoppedReason;
  if (stopped) return `Stopped — ${stopped.replace(/_/g, ' ')}`;
  const last = r.steps[r.steps.length - 1];
  if (!last) return 'Pending';
  return last.status.replace(/_/g, ' ');
}

function statusBadgeClass(status: string) {
  if (status.startsWith('stopped_') || status === 'failed') {
    return 'bg-status-danger-bg text-status-danger-text';
  }
  if (status === 'clicked') return 'bg-primary-surface text-primary';
  if (status === 'opened') return 'bg-primary-surface text-primary';
  if (status === 'delivered' || status === 'sent') return 'bg-status-success-bg text-status-success-text';
  return 'bg-gray-100 text-gray-600';
}

function formatActivityType(eventType: string) {
  return eventType.replace(/_/g, ' ').toUpperCase();
}

function activityDescription(eventType: string, payload: Record<string, unknown>) {
  switch (eventType) {
    case 'campaign_paused':
      return 'Campaign paused by administrator.';
    case 'campaign_resumed':
      return `Campaign resumed (status: ${String(payload.status ?? 'running')}).`;
    case 'campaign_cancelled':
      return `Campaign cancelled. ${String(payload.pendingSends ?? 0)} pending sends skipped.`;
    case 'campaign_duplicated':
      return `Duplicated from campaign ${String(payload.sourceCampaignId ?? '').slice(0, 8)}…`;
    case 'campaign_completed':
      return 'All scheduled emails finished — campaign marked completed.';
    case 'step_sent':
      return `Email ${String(payload.stepOrder ?? '')} sent to recipient.`;
    case 'step_delivered':
      return `Email ${String(payload.stepOrder ?? '')} delivered.`;
    case 'step_opened':
      return 'Recipient opened the email.';
    case 'step_clicked':
      return 'Recipient clicked a link in the email.';
    case 'step_failed':
      return `Send failed: ${String(payload.error ?? 'provider error')}`;
    case 'soft_bounce':
      return `Soft bounce — retry scheduled (attempt ${String(payload.retryCount ?? 1)}).`;
    case 'complaint':
      return 'Spam complaint received from recipient.';
    case 'recipient_stop':
      return `Recipient stopped — ${String(payload.reason ?? 'unknown').replace(/_/g, ' ')}.`;
    default:
      if (Object.keys(payload).length === 0) return formatActivityType(eventType);
      return `${formatActivityType(eventType)} — ${JSON.stringify(payload)}`;
  }
}

const RECIPIENT_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'stopped', label: 'Stopped' },
  { id: 'stopped_bounce', label: 'Bounced' },
  { id: 'stopped_unsubscribe', label: 'Unsubscribed' },
  { id: 'stopped_reply', label: 'Replied' },
  { id: 'stopped_complaint', label: 'Complained' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'opened', label: 'Opened' },
  { id: 'clicked', label: 'Clicked' },
  { id: 'failed', label: 'Failed' },
  { id: 'pending', label: 'Pending' },
  { id: 'not_opened', label: 'Not opened' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'steps', label: 'Email Steps' },
  { id: 'recipients', label: 'Recipients' },
  { id: 'activity', label: 'Activity Log' },
];

function CampaignStatsSkeleton({ activeTab }: { activeTab: Tab }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading campaign stats">
      <div className="flex justify-between gap-4 flex-wrap">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`h-8 rounded-lg animate-pulse ${
              t.id === activeTab ? 'w-24 bg-primary-surface' : 'w-20 bg-gray-100'
            }`}
          />
        ))}
      </div>
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-50 rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      )}
      {activeTab === 'steps' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      )}
      {activeTab === 'recipients' && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-10 bg-gray-50 animate-pulse" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 border-t border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      )}
      {activeTab === 'activity' && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

export function CampaignStatsView({
  campaign,
  stats,
  loading,
  isAdmin,
  onPause,
  onResume,
  onCancel,
  onExport,
  onProcessDue,
  processingDue,
  exporting,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipientFilter, setRecipientFilter] = useState('all');

  const filteredRecipients = useMemo(() => {
    if (!stats) return [];
    const { recipients } = stats;
    if (recipientFilter === 'all') return recipients;
    if (recipientFilter === 'stopped') {
      return recipients.filter((r) => r.stoppedReason || r.steps.some((s) => s.status.startsWith('stopped_')));
    }
    if (recipientFilter === 'not_opened') {
      return recipients.filter(
        (r) =>
          r.steps.some((s) => s.status === 'delivered' || s.status === 'sent') &&
          !r.steps.some((s) => s.status === 'opened' || s.status === 'clicked')
      );
    }
    if (recipientFilter.startsWith('stopped_')) {
      return recipients.filter(
        (r) =>
          r.stoppedReason === recipientFilter.replace('stopped_', '') ||
          r.steps.some((s) => s.status === recipientFilter)
      );
    }
    return recipients.filter((r) => r.steps.some((s) => s.status === recipientFilter));
  }, [recipientFilter, stats]);

  if (loading || !stats) {
    return <CampaignStatsSkeleton activeTab={tab} />;
  }

  const { overview, steps, recipients, activity } = stats;
  const scheduleTimezone = stats.scheduleTimezone || campaign.scheduleTimezone || 'UTC';
  const scheduleMode = stats.scheduleMode || campaign.scheduleMode || 'recipient_local';
  const formatTs = (iso: string) => formatInTimezone(iso, scheduleTimezone);

  const canControl =
    isAdmin &&
    (campaign.status === 'running' ||
      campaign.status === 'scheduled' ||
      campaign.status === 'paused');

  const showProcessDue =
    isAdmin &&
    onProcessDue &&
    (campaign.status === 'scheduled' ||
      campaign.status === 'running' ||
      campaign.status === 'paused');

  const headerActions = (
    <div className="flex gap-2 flex-wrap items-center">
      {showProcessDue ? (
        <button
          type="button"
          onClick={() => void onProcessDue()}
          disabled={processingDue}
          className="marketing-btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 shadow-sm"
        >
          <MarketingIcon name="play_circle" className="text-[20px]" />
          {processingDue ? 'Processing…' : 'Process due sends now'}
        </button>
      ) : null}
      {canControl ? (
        <>
          {campaign.status === 'paused' && onResume ? (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium text-on-surface-variant"
            >
              <MarketingIcon name="play_arrow" className="text-[20px]" />
              Resume
            </button>
          ) : campaign.status !== 'paused' ? (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium text-on-surface-variant"
            >
              <MarketingIcon name="pause" className="text-[20px]" />
              Pause
            </button>
          ) : null}
          {campaign.status !== 'cancelled' && campaign.status !== 'completed' && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 border border-status-danger-text/20 text-status-danger-text rounded-lg hover:bg-status-danger-bg transition-all font-medium"
            >
              <MarketingIcon name="cancel" className="text-[20px]" />
              Cancel
            </button>
          )}
        </>
      ) : null}
      {isAdmin ? (
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-all font-medium disabled:opacity-60"
        >
          <MarketingIcon name="file_download" className="text-[20px]" />
          {exporting ? 'Exporting…' : 'Export'}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-headline-lg text-on-surface">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="text-on-surface-variant text-body-md">
            {campaign.launchedAt
              ? `Started ${formatInTimezone(campaign.launchedAt, scheduleTimezone)}`
              : 'Not launched'}
            {' · '}
            {overview.totalRecipients} recipients
            {' · '}
            {scheduleModeLabel(scheduleMode)} ({timezoneShortLabel(scheduleTimezone)})
          </p>
        </div>
        {headerActions}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-8 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-4 whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'text-primary border-b-2 border-primary font-bold'
                  : 'text-gray-500 hover:text-gray-700 font-medium'
              }`}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <>
          {overview.pending > 0 && (campaign.status === 'running' || campaign.status === 'scheduled') && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <MarketingIcon name="sync" className="animate-spin duration-[3000ms]" />
                  {campaign.status === 'scheduled' ? 'Scheduled — waiting to send' : 'Processing'} —{' '}
                  {overview.sent} of {overview.sent + overview.pending} sends
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-on-surface-variant font-data-mono">
                    {overview.progressPercent}% completed
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary relative overflow-hidden"
                  style={{ width: `${overview.progressPercent}%` }}
                />
              </div>
              {campaign.status === 'scheduled' && (
                <p className="text-xs text-on-surface-variant">
                  Sends run via the background scheduler every minute. On preview deployments, use
                  &quot;Process due sends now&quot; if emails are past their scheduled time.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-label-caps text-on-surface-variant mb-8 uppercase">
                Engagement Funnel
              </h3>
              <div className="space-y-6">
                {[
                  { label: 'Enrolled', value: overview.totalRecipients, width: 100, color: 'bg-gray-200' },
                  { label: 'Sent', value: overview.sent, width: overview.totalRecipients ? (overview.sent / overview.totalRecipients) * 100 : 0, color: 'bg-primary/40' },
                  { label: 'Delivered', value: overview.delivered, width: overview.sent ? (overview.delivered / overview.sent) * 100 : 0, color: 'bg-primary/60' },
                  { label: 'Opened', value: overview.opened, width: overview.delivered ? (overview.opened / overview.delivered) * 100 : 0, color: 'bg-primary' },
                  { label: 'Clicked', value: overview.clicked, width: overview.opened ? (overview.clicked / overview.opened) * 100 : 0, color: 'bg-primary-container' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-gray-500 text-[13px] font-medium">{row.label}</span>
                      <span className="text-headline-sm">{row.value.toLocaleString()}</span>
                    </div>
                    <div className="h-10 bg-gray-50 rounded-lg relative overflow-hidden">
                      <div
                        className={`h-full ${row.color} absolute left-0 top-0 transition-all`}
                        style={{ width: `${Math.max(row.width, row.value > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-label-caps text-on-surface-variant mb-6 uppercase">
                Stop Metrics
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Bounced', value: overview.stoppedBounce, icon: 'move_to_inbox', bg: 'bg-status-bounced-bg', text: 'text-status-bounced-text' },
                  { label: 'Unsubscribed', value: overview.stoppedUnsubscribe, icon: 'person_remove', bg: 'bg-status-danger-bg', text: 'text-status-danger-text' },
                  { label: 'Replied', value: overview.stoppedReply, icon: 'reply', bg: 'bg-primary-surface', text: 'text-status-reply-text' },
                  { label: 'Complaints', value: overview.stoppedComplaint, icon: 'report', bg: 'bg-orange-100', text: 'text-orange-600' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${m.bg} flex items-center justify-center rounded-lg`}>
                      <MarketingIcon name={m.icon} className={m.text} />
                    </div>
                    <div>
                      <p className="text-headline-sm font-bold">{m.value}</p>
                      <p className="text-xs text-gray-500">{m.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'steps' && (
        <div className="space-y-6">
          {steps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No email steps configured.</p>
          ) : (
            steps.map((step) => {
              const total = step.sent + step.pending + step.failed + step.stopped;
              const openRate = pct(step.opened, step.delivered || step.sent);
              const clickRate = pct(step.clicked, step.opened || step.delivered);
              return (
                <div
                  key={step.stepOrder}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex"
                >
                  <div className="w-1.5 bg-primary shrink-0" />
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center w-8 h-8 bg-primary-surface text-primary rounded-full font-bold text-sm">
                            {step.stepOrder}
                          </span>
                          <div>
                            <h3 className="text-headline-sm">
                              {step.subject || `Step ${step.stepOrder}`}
                            </h3>
                            {step.sendAt && (
                              <p className="text-xs text-gray-500 font-data-mono mt-0.5">
                                Scheduled {formatTs(step.sendAt)} ({timezoneShortLabel(scheduleTimezone)})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {step.pending > 0 && (
                        <span className="px-3 py-1 bg-status-scheduled-bg text-status-scheduled-text rounded-full text-xs font-bold uppercase shrink-0">
                          In Progress
                        </span>
                      )}
                    </div>
                    <div className="ml-11 grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                      <div>
                        <p className="text-label-caps text-gray-400 uppercase text-xs">Sent</p>
                        <p className="text-headline-md font-bold mt-1">
                          {step.sent}{' '}
                          <span className="text-sm font-normal text-gray-400">{pct(step.sent, total)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-label-caps text-gray-400 uppercase text-xs">Delivered</p>
                        <p className="text-headline-md font-bold mt-1">
                          {step.delivered}{' '}
                          <span className="text-sm font-normal text-gray-400">
                            {pct(step.delivered, step.sent)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-label-caps text-primary uppercase text-xs">Opened</p>
                        <p className="text-headline-md font-bold mt-1 text-primary">
                          {step.opened}{' '}
                          <span className="text-sm font-normal text-primary-fixed-dim">{openRate}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-label-caps text-primary uppercase text-xs">Clicked</p>
                        <p className="text-headline-md font-bold mt-1 text-primary">
                          {step.clicked}{' '}
                          <span className="text-sm font-normal text-primary-fixed-dim">{clickRate}</span>
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 h-2 bg-gray-100 rounded-full flex overflow-hidden mb-4">
                      <div className="h-full bg-primary" style={{ width: openRate }} />
                      <div className="h-full bg-primary-border" style={{ width: clickRate }} />
                    </div>
                    {(step.stopped > 0 || step.failed > 0) && (
                      <div className="ml-11 text-xs text-gray-500">
                        {step.stopped > 0 && <span>{step.stopped} stopped · </span>}
                        {step.failed > 0 && <span>{step.failed} failed</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'recipients' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {RECIPIENT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRecipientFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  recipientFilter === f.id
                    ? 'bg-primary-surface border-primary-border text-primary'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Recipient</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Status</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Progress</th>
                  <th className="px-6 py-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">
                      No recipients match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((r) => {
                    const expanded = expandedId === r.recipientId;
                    const completed = r.steps.filter(
                      (s) => !['pending', 'skipped'].includes(s.status)
                    ).length;
                    const initials = r.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <Fragment key={r.recipientId}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${expanded ? 'bg-primary-surface/30' : ''}`}
                          onClick={() =>
                            setExpandedId(expanded ? null : r.recipientId)
                          }
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-primary font-bold text-xs">
                                {initials}
                              </div>
                              <div>
                                <Link
                                  href={`/dashboard/contacts/${r.contactId}` as Route}
                                  className="text-body-lg text-on-surface hover:text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {r.name}
                                </Link>
                                <p className="text-xs text-gray-400 font-data-mono">{r.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-label-caps text-[11px] capitalize ${statusBadgeClass(r.stoppedReason ? 'stopped' : r.steps.at(-1)?.status ?? 'pending')}`}
                            >
                              {recipientStatusLabel(r)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: steps.length
                                      ? `${(completed / steps.length) * 100}%`
                                      : '0%',
                                  }}
                                />
                              </div>
                              <span className="text-xs font-data-mono text-gray-400">
                                {completed}/{steps.length || r.steps.length}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <MarketingIcon
                              name="expand_more"
                              className={`text-gray-400 transition-transform ${expanded ? 'rotate-180 text-primary' : ''}`}
                            />
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-white">
                            <td colSpan={4} className="px-6 py-0">
                              <div className="py-6 pl-12 border-l-2 border-gray-200 ml-10 my-2 space-y-6">
                                {r.steps.map((s) => (
                                  <div key={s.stepOrder} className="relative">
                                    <div className="absolute -left-[45px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-primary z-10" />
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-3">
                                        <p className="text-body-lg">
                                          Step {s.stepOrder}
                                        </p>
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(s.status)}`}
                                        >
                                          {s.status.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      {s.sentAt && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                          <MarketingIcon name="schedule" className="text-sm" />
                                          {formatTs(s.sentAt!)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              For debugging — sanitized errors only
            </span>
            <span className="text-[11px] text-gray-400">Showing last {activity.length} events</span>
          </div>
          <div className="grid grid-cols-[160px_180px_1fr] px-6 py-3 border-b border-gray-100 bg-white">
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
              Timestamp
            </div>
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
              Event Type
            </div>
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
              Description
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">No activity yet.</p>
            ) : (
              activity.map((ev) => (
                <div
                  key={ev.id}
                  className="grid grid-cols-[160px_180px_1fr] px-6 py-3 border-b border-gray-50 hover:bg-gray-50/50 items-center"
                >
                  <div className="font-data-mono text-[12px] text-gray-500">
                    {formatTs(ev.createdAt)}
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      {formatActivityType(ev.eventType)}
                    </span>
                  </div>
                  <div className="text-body-md text-on-surface-variant">
                    {activityDescription(ev.eventType, ev.payload)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
