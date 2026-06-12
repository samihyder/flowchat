'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailCampaign } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Email campaigns"
        description="Broadcasts with delivery and engagement analytics"
        action={
          <Link href={'/dashboard/marketing/campaigns/new' as Route}>
            <Button type="button">New campaign</Button>
          </Link>
        }
      />

      <div className="px-6 pb-6 flex-1 overflow-auto">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Open %</th>
                <th className="px-4 py-3">Click %</th>
                <th className="px-4 py-3">Bounce %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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
                      <p className="text-xs text-gray-400 truncate max-w-xs">{c.subject}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.status}</td>
                    <td className="px-4 py-3">
                      {c.sentCount}/{c.totalRecipients}
                    </td>
                    <td className="px-4 py-3">{c.rates?.openRate ?? 0}%</td>
                    <td className="px-4 py-3">{c.rates?.clickRate ?? 0}%</td>
                    <td className="px-4 py-3">{c.rates?.bounceRate ?? 0}%</td>
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
