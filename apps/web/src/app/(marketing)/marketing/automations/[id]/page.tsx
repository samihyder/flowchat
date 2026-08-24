'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type AutomationRecipient } from '@/lib/api';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';
import { marketingRoutes } from '@/lib/marketing/routes';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';

type Stats = {
  workflow: {
    id: string;
    name: string;
    enabled: boolean;
    senderId: string | null;
    createdAt: string;
    totalEnrolled: number;
    activeEnrolled: number;
    completedEnrolled: number;
    emailCount: number;
  };
  summary: {
    totalContacts: number;
    emailsSent: number;
    opened: number;
    clicked: number;
    bounced: number;
    notOpened: number;
    openRate: number;
    clickRate: number;
  };
  recipients: (AutomationRecipient & { status?: string })[];
};

const statusStyle: Record<string, string> = {
  clicked: 'bg-primary-surface text-primary',
  opened: 'bg-status-success-bg text-status-success-text',
  bounced: 'bg-status-danger-bg text-status-danger-text',
  send_failed: 'bg-status-danger-bg text-status-danger-text',
  completed: 'bg-gray-100 text-gray-600',
};

export default function AutomationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const automationId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!token || !accountId) return;
    setLoading(true);
    api.marketing.automations
      .get(accountId, automationId, token)
      .then((r) => setStats(r as unknown as Stats))
      .catch((err) => setError(marketingErrorMessage(err, 'Could not load automation.')))
      .finally(() => setLoading(false));
  }, [token, accountId, automationId]);

  useEffect(load, [load]);

  const toggleEnabled = async () => {
    if (!token || !accountId || !stats) return;
    setBusy(true);
    try {
      await api.marketing.automations.update(accountId, automationId, { enabled: !stats.workflow.enabled }, token);
      load();
    } finally {
      setBusy(false);
    }
  };

  const processDue = async () => {
    if (!token || !accountId) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await api.marketing.automations.processDue(accountId, automationId, token);
      setMessage(`Processed ${res.processed} due send(s).`);
      load();
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    if (!token || !accountId || !confirm('Restart this automation for its enrolled contacts?')) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await api.marketing.automations.restart(accountId, automationId, token);
      setMessage(`Restarted ${res.processed} enrollment(s).`);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!token || !accountId || !confirm('Delete this automation? Enrolled contacts will stop receiving it.')) return;
    setBusy(true);
    try {
      await api.marketing.automations.delete(accountId, automationId, token);
      router.push(marketingRoutes.automations as Route);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="p-8 text-sm text-gray-400 text-center">Loading…</p>;
  }
  if (!stats) {
    return <p className="p-8 text-sm text-red-600 text-center">{error || 'Automation not found.'}</p>;
  }

  const { workflow, summary, recipients } = stats;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader
        title={workflow.name}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                workflow.enabled ? 'bg-status-success-bg text-status-success-text' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {workflow.enabled ? 'Active' : 'Paused'}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleEnabled()}
              className="text-xs font-semibold text-gray-600 hover:underline px-2 py-1.5 disabled:opacity-50"
            >
              {workflow.enabled ? 'Pause' : 'Resume'}
            </button>
            <Link
              href={marketingRoutes.automationEdit(automationId) as Route}
              className="text-xs font-semibold text-primary hover:underline px-2 py-1.5"
            >
              Edit
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void processDue()}
              className="marketing-btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
            >
              Process due sends
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full space-y-6">
        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Enrolled', value: workflow.totalEnrolled },
            { label: 'Emails sent', value: summary.emailsSent },
            { label: 'Open rate', value: `${summary.openRate}%` },
            { label: 'Click rate', value: `${summary.clickRate}%` },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-on-surface">{s.value}</p>
              <p className="text-xs text-gray-400 uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Recipients ({recipients.length})</h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restart()}
              className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50"
            >
              Restart automation
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-5 py-2 font-medium">Contact</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Emails sent</th>
                  <th className="px-5 py-2 font-medium">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.contactId} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.email}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          statusStyle[r.status ?? ''] ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {(r.status ?? r.enrollmentStatus).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{r.emailsSent}</td>
                    <td className="px-5 py-2.5 text-gray-400 text-xs">
                      {new Date(r.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recipients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                      No contacts enrolled yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="text-xs text-gray-400 hover:text-status-danger-text disabled:opacity-50"
        >
          Delete automation
        </button>
      </div>
    </div>
  );
}
