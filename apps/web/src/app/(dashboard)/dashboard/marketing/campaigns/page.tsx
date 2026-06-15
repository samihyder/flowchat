'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailCampaign } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';

const statusColor: Record<string, 'success' | 'warning' | 'gray' | 'primary'> = {
  sent: 'success',
  sending: 'primary',
  scheduled: 'warning',
  draft: 'gray',
  paused: 'warning',
  cancelled: 'gray',
};

export default function CampaignsPage() {
  const { token, accountId } = useAuthStore();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);

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
    const sent = campaigns.filter((c) => c.status === 'sent' || c.status === 'sending').length;
    const scheduled = campaigns.filter((c) => c.status === 'scheduled').length;
    const avgOpen =
      campaigns.length > 0
        ? Math.round(
            campaigns.reduce((n, c) => n + (c.rates?.openRate ?? 0), 0) / campaigns.length
          )
        : 0;
    return { total: campaigns.length, sent, scheduled, avgOpen };
  }, [campaigns]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Email campaigns"
        description="Broadcasts with delivery and engagement analytics"
        action={
          <Link href={'/dashboard/marketing/campaigns/new' as Route}>
            <Button type="button">+ New campaign</Button>
          </Link>
        }
      />

      <div className="px-6 pb-4">
        <MetricGrid>
          <MetricCard label="Campaigns" value={loading ? '—' : stats.total} accent="primary" />
          <MetricCard label="Sent / sending" value={stats.sent} accent="accent" />
          <MetricCard label="Scheduled" value={stats.scheduled} accent="amber" />
          <MetricCard label="Avg open rate" value={`${stats.avgOpen}%`} hint="Across all campaigns" />
        </MetricGrid>
      </div>

      <div className="px-6 pb-6 flex-1 overflow-auto">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Open %</th>
                <th className="px-4 py-3">Click %</th>
                <th className="px-4 py-3">Bounce %</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No campaigns yet. Create your first broadcast.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/marketing/campaigns/${c.id}` as Route}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{c.subject}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <Badge color={statusColor[c.status] ?? 'gray'}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.sentCount}/{c.totalRecipients}
                    </td>
                    <td className="px-4 py-3">{c.rates?.openRate ?? 0}%</td>
                    <td className="px-4 py-3">{c.rates?.clickRate ?? 0}%</td>
                    <td className="px-4 py-3">{c.rates?.bounceRate ?? 0}%</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/marketing/campaigns/${c.id}` as Route}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        View →
                      </Link>
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
