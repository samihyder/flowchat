'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailAutomation } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

export default function WorkflowsPage() {
  const { token, accountId } = useAuthStore();
  const [workflows, setWorkflows] = useState<EmailAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!token || !accountId) return;
    setLoading(true);
    api.marketing.automations
      .list(accountId, token)
      .then((r) => setWorkflows(r.automations))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, accountId]);

  const toggleEnabled = async (workflow: EmailAutomation) => {
    if (!token || !accountId) return;
    setBusyId(workflow.id);
    try {
      await api.marketing.automations.update(accountId, workflow.id, { enabled: !workflow.enabled }, token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (workflowId: string) => {
    if (!token || !accountId || !window.confirm('Delete this workflow? Enrolled contacts will stop receiving emails.'))
      return;
    setBusyId(workflowId);
    try {
      await api.marketing.automations.delete(accountId, workflowId, token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader
        title="Workflows"
        action={
          <Link
            href={marketingRoutes.workflowNew as Route}
            className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            New workflow
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full">
        <header className="mb-8">
          <h2 className="text-headline-lg text-on-surface mb-2">Automation workflows</h2>
          <p className="text-on-surface-variant max-w-2xl text-sm">
            Enroll contacts in a scheduled email sequence. Each workflow sends its emails to every
            enrolled contact at the configured times.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-gray-400">Loading workflows…</p>
        ) : workflows.length === 0 ? (
          <section className="relative min-h-[360px] rounded-3xl overflow-hidden flex items-center justify-center p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] via-white to-[#F0FDFA] opacity-90" />
            <div className="relative z-10 text-center max-w-lg">
              <div className="w-28 h-28 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto ring-1 ring-gray-100 -rotate-2 mb-8">
                <MarketingIcon name="bolt" className="text-5xl text-primary/50" />
              </div>
              <h2 className="text-headline-md text-on-surface mb-3">No workflows yet</h2>
              <p className="text-sm text-on-surface-variant mb-10 leading-relaxed">
                Build a scheduled email sequence and enroll contacts to automate nurture and
                follow-up outreach.
              </p>
              <Link
                href={marketingRoutes.workflowNew as Route}
                className="inline-flex marketing-btn-primary px-8 py-3 rounded-xl font-bold text-sm shadow-lg"
              >
                Create your first workflow
              </Link>
            </div>
          </section>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Workflow</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Status</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Enrolled</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Emails sent</th>
                  <th className="px-6 py-4 w-40" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workflows.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={marketingRoutes.workflow(w.id) as Route}
                        className="font-semibold text-on-surface hover:text-primary"
                      >
                        {w.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {w.emailCount} email{w.emailCount === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={w.enabled}
                        disabled={busyId === w.id}
                        onClick={() => void toggleEnabled(w)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                          w.enabled ? 'bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            w.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-semibold text-on-surface">{w.contactCount}</td>
                    <td className="px-6 py-4 text-gray-600">{w.emailsSent}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <Link
                        href={marketingRoutes.workflow(w.id) as Route}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => void remove(w.id)}
                        className="text-xs text-gray-500 hover:text-status-danger-text disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MarketingListFooter />
    </div>
  );
}
