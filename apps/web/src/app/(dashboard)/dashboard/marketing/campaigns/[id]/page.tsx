'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type EmailCampaign } from '@/lib/api';
import { Button } from '@/components/ui/button';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [breakdown, setBreakdown] = useState<{ status: string; count: number }[]>([]);
  const [abStats, setAbStats] = useState<{ variant: string; sent: number; opened: number }[]>([]);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.campaigns.get(accountId, campaignId, token).then((r) => {
      setCampaign(r.campaign);
      setBreakdown(r.statusBreakdown);
      setAbStats(r.abStats ?? []);
    });
  };

  useEffect(load, [token, accountId, campaignId]);

  const sendCampaign = async () => {
    if (!token || !accountId || !confirm('Send this campaign to all subscribed contacts in the segment?')) return;
    setSending(true);
    setStatusMsg('Starting send…');
    try {
      const start = await api.marketing.campaigns.send(accountId, campaignId, token);
      setStatusMsg(`Queued ${start.totalRecipients} recipients…`);
      const poll = async () => {
        const res = await api.marketing.campaigns.process(accountId, campaignId, token);
        if (!res.done) {
          setStatusMsg(`Sending… processed batch of ${res.processed}`);
          setTimeout(poll, 2000);
          return;
        }
        setStatusMsg('Campaign send complete.');
        load();
        setSending(false);
      };
      if (!start.done) await poll();
      else {
        setStatusMsg('Campaign send complete.');
        load();
        setSending(false);
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Send failed');
      setSending(false);
    }
  };

  if (!campaign) {
    return <div className="p-8 text-sm text-gray-400">Loading campaign…</div>;
  }

  const rates = campaign.rates;

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in p-6 space-y-6">
      <div>
        <Link href={'/dashboard/marketing/campaigns' as Route} className="text-sm text-primary-600 hover:underline">
          ← Campaigns
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{campaign.name}</h1>
            <p className="text-sm text-gray-500">{campaign.subject}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">
              {campaign.status} · Segment: {campaign.segmentName ?? '—'}
            </p>
          </div>
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <Button type="button" disabled={sending} onClick={() => void sendCampaign()}>
              {sending ? 'Sending…' : campaign.status === 'scheduled' ? 'Send now (override)' : 'Send now'}
            </Button>
          )}
          {campaign.status === 'sending' && (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => void api.marketing.campaigns.control(accountId!, campaignId, 'pause', token!).then(load)}>
                Pause
              </Button>
              <Button type="button" variant="secondary" onClick={() => void api.marketing.campaigns.control(accountId!, campaignId, 'cancel', token!).then(load)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        {statusMsg && <p className="text-sm text-gray-600 mt-2">{statusMsg}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Recipients" value={String(campaign.totalRecipients)} />
        <StatCard label="Sent" value={String(campaign.sentCount)} sub={`${rates?.deliveryRate ?? 0}% delivered`} />
        <StatCard label="Open rate" value={`${rates?.openRate ?? 0}%`} sub={`${campaign.openedCount} opens`} />
        <StatCard label="Click rate" value={`${rates?.clickRate ?? 0}%`} sub={`${campaign.clickedCount} clicks`} />
        <StatCard label="Bounce rate" value={`${rates?.bounceRate ?? 0}%`} sub={`${campaign.bouncedCount} bounces`} />
        <StatCard label="Unsubscribe rate" value={`${rates?.unsubscribeRate ?? 0}%`} />
        <StatCard label="Complaints" value={String(campaign.complainedCount)} sub={`${rates?.complaintRate ?? 0}%`} />
        <StatCard label="Failed" value={String(campaign.failedCount)} />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Recipient status breakdown</h2>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {breakdown.map((b) => (
            <li key={b.status} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="capitalize text-gray-600">{b.status}</span>
              <span className="font-medium">{b.count}</span>
            </li>
          ))}
          {breakdown.length === 0 && <p className="text-gray-400 col-span-full">No recipients yet.</p>}
        </ul>
      </section>

      {abStats.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">A/B subject results</h2>
          <ul className="text-sm space-y-2">
            {abStats.map((v) => (
              <li key={v.variant} className="flex justify-between">
                <span>Variant {v.variant}</span>
                <span>{v.opened}/{v.sent} opens ({v.sent ? Math.round((v.opened / v.sent) * 100) : 0}%)</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
