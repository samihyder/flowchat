'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type AutomationRecipient } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

type WorkflowMeta = {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  totalEnrolled: number;
  activeEnrolled: number;
  completedEnrolled: number;
  emailCount: number;
};

type Summary = {
  totalContacts: number;
  emailsSent: number;
  opened: number;
  clicked: number;
  bounced: number;
  notOpened: number;
  openRate: number;
  clickRate: number;
};

const STATUS_STYLES: Record<string, string> = {
  clicked: 'bg-purple-100 text-purple-800',
  opened: 'bg-blue-100 text-blue-800',
  sent: 'bg-gray-100 text-gray-600',
  waiting: 'bg-yellow-100 text-yellow-800',
  bounced: 'bg-red-100 text-red-800',
  send_failed: 'bg-red-100 text-red-800',
  finished_no_email: 'bg-gray-100 text-gray-500',
  not_subscribed: 'bg-gray-100 text-gray-500',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<WorkflowMeta | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recipients, setRecipients] = useState<AutomationRecipient[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    if (!token || !accountId) return;
    setLoading(true);
    api.marketing.automations
      .get(accountId, workflowId, token)
      .then((r) => {
        setWorkflow(r.workflow as unknown as WorkflowMeta);
        setSummary(r.summary);
        setRecipients(r.recipients);
      })
      .catch(() => router.push(marketingRoutes.workflows as Route))
      .finally(() => setLoading(false));
  }, [accountId, router, token, workflowId]);

  useEffect(load, [load]);

  const toggleEnabled = async () => {
    if (!token || !accountId || !workflow) return;
    setBusy(true);
    try {
      await api.marketing.automations.update(accountId, workflowId, { enabled: !workflow.enabled }, token);
      load();
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    if (!token || !accountId) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await api.marketing.automations.restart(accountId, workflowId, token);
      setMsg(`Restarted ${res.processed} enrollment(s).`);
      load();
    } finally {
      setBusy(false);
    }
  };

  const processNow = async () => {
    if (!token || !accountId) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await api.marketing.automations.processDue(accountId, workflowId, token);
      setMsg(`Processed ${res.processed} due step(s).`);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!token || !accountId || !window.confirm('Delete this workflow?')) return;
    setBusy(true);
    try {
      await api.marketing.automations.delete(accountId, workflowId, token);
      router.push(marketingRoutes.workflows as Route);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !workflow || !summary) {
    return (
      <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
        Loading workflow…
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader
        title={workflow.name}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void processNow()}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Process now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restart()}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Restart
            </button>
            <Link
              href={marketingRoutes.workflowEdit(workflowId) as Route}
              className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold text-sm shadow-sm"
            >
              Edit
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full space-y-6">
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${
              workflow.enabled ? 'bg-status-success-bg text-status-success-text' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {workflow.enabled ? 'Active' : 'Draft'}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleEnabled()}
            className={
              workflow.enabled
                ? 'px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                : 'marketing-btn-primary px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50'
            }
          >
            {workflow.enabled ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="ml-auto text-xs text-gray-500 hover:text-status-danger-text disabled:opacity-50"
          >
            Delete workflow
          </button>
        </div>

        {msg && <p className="text-sm text-status-success-text">{msg}</p>}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Enrolled', value: summary.totalContacts },
            { label: 'Emails sent', value: summary.emailsSent },
            { label: 'Open rate', value: `${summary.openRate}%` },
            { label: 'Click rate', value: `${summary.clickRate}%` },
            { label: 'Bounced', value: summary.bounced },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-on-surface">{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Recipients ({recipients.length})</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-label-caps text-on-surface-variant">Contact</th>
                <th className="px-6 py-3 text-label-caps text-on-surface-variant">Status</th>
                <th className="px-6 py-3 text-label-caps text-on-surface-variant">Emails sent</th>
                <th className="px-6 py-3 text-label-caps text-on-surface-variant">Enrolled</th>
                <th className="px-6 py-3 text-label-caps text-on-surface-variant">Next send</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    No contacts enrolled yet.
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.contactId} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-on-surface">{r.name}</p>
                      <p className="text-xs text-gray-400 font-data-mono">{r.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{r.emailsSent}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {new Date(r.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {r.nextRunAt ? new Date(r.nextRunAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
