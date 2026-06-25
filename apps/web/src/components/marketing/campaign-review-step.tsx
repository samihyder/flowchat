'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import {
  api,
  type CampaignRecipientDetail,
  type CampaignSenderConfig,
  type CampaignStep,
  type MarketingCampaign,
  type PreflightResult,
} from '@/lib/api';
import { formatSendAtLabel } from '@/lib/marketing/automation-email-draft';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { CampaignLaunchModal } from '@/components/marketing/campaign-launch-modal';

type Props = {
  accountId: string;
  campaignId: string;
  token: string;
  campaign: MarketingCampaign;
  steps: CampaignStep[];
  recipients: CampaignRecipientDetail[];
  recipientSummary: { selected: number; suppressed: number };
  sender: CampaignSenderConfig | null;
  isAdmin: boolean;
  onLaunched: () => void;
};

export function CampaignReviewStep({
  accountId,
  campaignId,
  token,
  campaign,
  steps,
  recipients,
  recipientSummary,
  sender,
  isAdmin,
  onLaunched,
}: Props) {
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [launchOpen, setLaunchOpen] = useState(false);
  const [timezone, setTimezone] = useState('UTC');

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.campaigns
      .getPreflight(accountId, campaignId, token)
      .then(setPreflight)
      .catch(() => setPreflight(null));
    api.account.get(accountId, token).then((r) => {
      setTimezone(r.account.timezone || 'UTC');
    });
  };

  useEffect(load, [accountId, campaignId, token]);

  const sendTest = async () => {
    setTestBusy(true);
    setTestMsg('');
    try {
      const res = await api.marketing.campaigns.testSend(accountId, campaignId, token);
      setTestMsg(`Test sent to ${res.sentTo}`);
      load();
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : 'Test send failed');
    } finally {
      setTestBusy(false);
    }
  };

  const formatCampaignId = (id: string) =>
    `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <div className="max-w-[1024px] mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review &amp; launch</h2>
        <p className="text-sm text-gray-500 mt-1">
          Confirm recipients, sequence, and sender before going live.
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-status-scheduled-bg bg-status-scheduled-bg/50 px-4 py-3 text-sm text-status-scheduled-text flex items-start gap-2">
          <MarketingIcon name="info" className="shrink-0 mt-0.5" />
          <p>
            An administrator must launch this campaign. You can save the draft and send a test
            email.
          </p>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Pre-flight checks</h3>
        </div>
        <ul className="divide-y divide-gray-100">
          {(preflight?.checks ?? []).map((check) => (
            <li key={check.id} className="px-6 py-3 flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">{check.label}</span>
              <span className="flex items-center gap-2 text-sm">
                {check.detail && (
                  <span className="text-gray-400 text-xs hidden sm:inline">{check.detail}</span>
                )}
                {check.ok ? (
                  <span className="inline-flex items-center gap-1 text-status-success-text font-medium">
                    <MarketingIcon name="check_circle" className="text-[18px]" />
                    Pass
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-status-danger-text font-medium">
                    <MarketingIcon name="cancel" className="text-[18px]" />
                    Fail
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Test send</h3>
            <p className="text-xs text-gray-500 mt-1">
              Required before launch. Uses email 1 content and your sender settings.
            </p>
            {sender?.testSentAt && (
              <p className="text-xs text-status-success-text mt-2">
                Last test sent {new Date(sender.testSentAt).toLocaleString()} to {sender.testSentTo}
              </p>
            )}
            {!preflight?.testValid && sender?.testSentAt && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <MarketingIcon name="warning" className="text-[16px]" />
                Test invalidated — content or sender changed. Send a new test.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={testBusy}
            className="border border-primary-border text-primary hover:bg-primary-surface px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {testBusy ? 'Sending…' : 'Send test to me'}
          </button>
        </div>
        {testMsg && <p className="text-sm text-gray-600 mt-3">{testMsg}</p>}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Campaign summary</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wider">Name</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{campaign.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wider">Campaign ID</dt>
            <dd className="font-medium text-gray-900 mt-0.5 font-data-mono">
              {formatCampaignId(campaign.id)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wider">Recipients</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {recipientSummary.selected} eligible
              {recipientSummary.suppressed > 0 && (
                <span className="text-amber-600">
                  {' '}
                  ({recipientSummary.suppressed} excluded)
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wider">Sender</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {sender?.fromName} &lt;{sender?.fromEmail}&gt;
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Send at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedSteps.map((step) => (
                <tr key={step.id ?? step.stepOrder}>
                  <td className="px-4 py-2 text-gray-500">{step.stepOrder}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{step.subject}</td>
                  <td className="px-4 py-2 text-gray-600 font-data-mono">
                    {step.sendAt
                      ? formatSendAtLabel(step.sendAt, timezone, 'en')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Link
          href={`/marketing/campaigns/${campaignId}/edit?step=1` as Route}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Edit recipients
          <MarketingIcon name="edit" className="text-[14px]" />
        </Link>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Recipient preview ({recipients.length})
        </h3>
        <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 text-sm">
          {recipients.slice(0, 20).map((r) => (
            <li key={r.contactId} className="py-2 flex justify-between gap-2">
              <span className="font-medium text-gray-900 truncate">{r.name}</span>
              <span className="text-gray-500 truncate">{r.email}</span>
            </li>
          ))}
        </ul>
        {recipients.length > 20 && (
          <p className="text-xs text-gray-400 mt-2">+ {recipients.length - 20} more</p>
        )}
      </section>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setLaunchOpen(true)}
            disabled={!preflight?.ready}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 shadow-sm"
          >
            Launch campaign
          </button>
        </div>
      )}

      <CampaignLaunchModal
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        campaignName={campaign.name}
        recipientCount={recipientSummary.selected}
        stepCount={sortedSteps.length}
        onConfirm={async () => {
          await api.marketing.campaigns.launch(accountId, campaignId, token);
          onLaunched();
        }}
      />
    </div>
  );
}
