'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type AutomationRecipient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';
import { AutomationSchedulePreview } from '@/components/marketing/automation-schedule-preview';
import { emailsFromWorkflowSteps } from '@/lib/marketing/schedule';
import { resolveScheduleTimezone } from '@/lib/timezone';
import { formatSendAtLabel } from '@/lib/marketing/automation-email-draft';

const STATUS_STYLES: Record<string, string> = {
  clicked: 'bg-green-100 text-green-800',
  opened: 'bg-blue-100 text-blue-800',
  delivered: 'bg-gray-100 text-gray-700',
  waiting: 'bg-amber-100 text-amber-800',
  bounced: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-600',
  not_subscribed: 'bg-orange-100 text-orange-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function AutomationDetailPage() {
  const params = useParams();
  const automationId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [summary, setSummary] = useState({
    totalContacts: 0,
    emailsSent: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    notOpened: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [recipients, setRecipients] = useState<AutomationRecipient[]>([]);
  const [filter, setFilter] = useState<'all' | 'opened' | 'not_opened' | 'clicked' | 'bounced'>('all');
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState(() => resolveScheduleTimezone());
  const [locale, setLocale] = useState('en');
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [scheduleEmails, setScheduleEmails] = useState<{ sendAt: string; subject?: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('');

  const load = () => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.automations.get(accountId, automationId, token),
      api.account.get(accountId, token),
    ]).then(([r, accountRes]) => {
      setName(String(r.workflow.name ?? ''));
      setEnabled(Boolean(r.workflow.enabled));
      setSummary(r.summary);
      setRecipients(r.recipients);
      setTimezone(resolveScheduleTimezone(accountRes.account.timezone));
      setLocale(accountRes.account.locale || 'en');
      setCreatedAt(typeof r.workflow.createdAt === 'string' ? r.workflow.createdAt : undefined);
      if (r.steps?.length) setScheduleEmails(emailsFromWorkflowSteps(r.steps));
      setLoading(false);
    });
  };

  useEffect(load, [token, accountId, automationId]);

  // Hobby Vercel has no per-minute cron — poll while contacts are waiting for a due send.
  useEffect(() => {
    if (!token || !accountId || !enabled) return;
    const hasDue = recipients.some(
      (r) => r.status === 'waiting' && r.nextRunAt && new Date(r.nextRunAt).getTime() <= Date.now()
    );
    if (!hasDue) return;
    const tick = () => {
      void api.marketing.automations.processDue(accountId, automationId, token)
        .then(() => load())
        .catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [token, accountId, automationId, enabled, recipients]);

  const filtered = recipients.filter((r) => {
    if (filter === 'opened') return r.opened && !r.bounced;
    if (filter === 'not_opened') return r.emailsSent > 0 && !r.opened && !r.bounced;
    if (filter === 'clicked') return r.clicked;
    if (filter === 'bounced') return r.bounced;
    return true;
  });

  const togglePause = async () => {
    if (!token || !accountId) return;
    await api.marketing.automations.update(accountId, automationId, { enabled: !enabled }, token);
    setEnabled(!enabled);
  };

  const processDueEmails = async () => {
    if (!token || !accountId) return;
    setProcessing(true);
    setProcessMessage('');
    try {
      const result = await api.marketing.automations.processDue(accountId, automationId, token);
      setProcessMessage(
        result.processed > 0
          ? `Processed ${result.processed} enrollment step(s). Refreshing…`
          : 'No due steps right now — check send times or edit the schedule.'
      );
      setTimeout(() => load(), 800);
    } catch (err) {
      setProcessMessage(err instanceof Error ? err.message : 'Failed to process emails');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Loading stats…</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <Link href={'/dashboard/marketing' as Route} className="text-sm text-primary-600 hover:underline">
          ← Email automations
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {enabled ? 'Active — follow-up emails send on schedule' : 'Paused'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href={`/dashboard/marketing/${automationId}/edit` as Route}>
              <Button type="button" variant="secondary" size="sm">
                Edit automation
              </Button>
            </Link>
            <Button type="button" variant="secondary" size="sm" onClick={() => void togglePause()}>
              {enabled ? 'Pause automation' : 'Resume automation'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={processing || !enabled}
              onClick={() => void processDueEmails()}
            >
              {processing ? 'Processing…' : 'Process due emails now'}
            </Button>
          </div>
        </div>
        {processMessage && <p className="text-sm text-gray-600 mt-2">{processMessage}</p>}
      </div>

      <div className="px-6 py-4">
        <MetricGrid>
          <MetricCard label="Contacts" value={summary.totalContacts} accent="primary" />
          <MetricCard label="Emails sent" value={summary.emailsSent} accent="neutral" />
          <MetricCard label="Opened" value={summary.opened} hint={`${summary.openRate}% of contacts`} accent="accent" />
          <MetricCard label="Clicked" value={summary.clicked} hint={`${summary.clickRate}% of contacts`} accent="primary" />
          <MetricCard label="Not opened" value={summary.notOpened} accent="amber" />
          <MetricCard label="Bounced" value={summary.bounced} accent="neutral" />
        </MetricGrid>
        {scheduleEmails.length > 0 && (
          <div className="mt-4 max-w-2xl">
            <AutomationSchedulePreview
              emails={scheduleEmails}
              timezone={timezone}
              locale={locale}
            />
          </div>
        )}
      </div>

      <div className="px-6 pb-2 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['opened', 'Opened'],
            ['not_opened', 'Not opened'],
            ['clicked', 'Clicked'],
            ['bounced', 'Bounced'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              filter === key
                ? 'bg-primary-100 border-primary-300 text-primary-800 font-medium'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Emails sent</th>
                <th className="px-4 py-3">Next send</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.contactId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/contacts/${r.contactId}` as Route}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.emailsSent}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.status === 'waiting' && r.nextRunAt
                      ? formatSendAtLabel(r.nextRunAt, locale, timezone)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No contacts match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
