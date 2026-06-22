'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailAutomation } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';

export default function MarketingHomePage() {
  const { token, accountId } = useAuthStore();
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !accountId) return;
    api.marketing.automations
      .list(accountId, token)
      .then((r) => setAutomations(r.automations))
      .catch(() => setAutomations([]))
      .finally(() => setLoading(false));
  }, [token, accountId]);

  const totalSent = automations.reduce((n, a) => n + a.emailsSent, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Email automations"
        description="Pick contacts → write emails → set day delays → track opens & clicks"
        action={
          <Link href={'/dashboard/marketing/new' as Route}>
            <Button>+ New automation</Button>
          </Link>
        }
      />

      <div className="px-6 pb-4">
        <MetricGrid>
          <MetricCard label="Automations" value={automations.length} accent="primary" />
          <MetricCard label="Emails sent" value={totalSent} accent="neutral" />
          <MetricCard label="Active" value={automations.filter((a) => a.enabled).length} accent="accent" />
        </MetricGrid>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <p className="text-sm text-gray-400 py-8">Loading…</p>
        ) : automations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center max-w-lg mx-auto mt-8">
            <p className="text-4xl mb-3">📧</p>
            <h2 className="text-lg font-semibold text-gray-900">No email automations yet</h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Select contacts from your CRM, compose emails in the editor, and schedule follow-ups every few days —
              like HubSpot, but simpler.
            </p>
            <Link href={'/dashboard/marketing/new' as Route}>
              <Button>Create your first automation</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contacts</th>
                  <th className="px-4 py-3">Emails</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {automations.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.contactCount}</td>
                    <td className="px-4 py-3 text-gray-600">{a.emailCount}</td>
                    <td className="px-4 py-3 text-gray-600">{a.emailsSent}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {a.enabled ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/marketing/${a.id}` as Route}
                        className="text-primary-600 hover:underline text-sm font-medium"
                      >
                        View stats →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
