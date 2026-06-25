'use client';

import Link from 'next/link';
import type { Route } from 'next';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  api,
  type CampaignRecipientDetail,
  type CampaignSenderConfig,
  type CampaignStep,
  type MarketingCampaign,
  type PreflightCheck,
  type PreflightResult,
} from '@/lib/api';
import { formatSendAtLabel } from '@/lib/marketing/automation-email-draft';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { CampaignLaunchModal } from '@/components/marketing/campaign-launch-modal';
import { initials } from '@/components/conversations/conversation-badges';

const CHECK_ICONS: Record<string, string> = {
  provider: 'lan',
  domain: 'verified_user',
  cron: 'update',
  test: 'mark_email_read',
};

export type CampaignReviewStepHandle = {
  openLaunch: () => void;
};

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
  onPreflightChange?: (preflight: PreflightResult | null) => void;
};

export const CampaignReviewStep = forwardRef<CampaignReviewStepHandle, Props>(
  function CampaignReviewStep(
    {
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
      onPreflightChange,
    },
    ref
  ) {
    const [preflight, setPreflight] = useState<PreflightResult | null>(null);
    const [testBusy, setTestBusy] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [testMsg, setTestMsg] = useState('');
    const [launchOpen, setLaunchOpen] = useState(false);
    const [timezone, setTimezone] = useState('UTC');

    const load = () => {
      if (!token || !accountId) return;
      api.marketing.campaigns
        .getPreflight(accountId, campaignId, token)
        .then((result) => {
          setPreflight(result);
          onPreflightChange?.(result);
        })
        .catch(() => {
          setPreflight(null);
          onPreflightChange?.(null);
        });
      api.account.get(accountId, token).then((r) => {
        setTimezone(r.account.timezone || 'UTC');
      });
    };

    useEffect(() => {
      load();
    }, [accountId, campaignId, token]);

    useImperativeHandle(ref, () => ({
      openLaunch: () => setLaunchOpen(true),
    }));

    const sendTest = async () => {
      setTestBusy(true);
      setTestMsg('');
      try {
        const res = await api.marketing.campaigns.testSend(
          accountId,
          campaignId,
          token,
          testEmail.trim() || undefined
        );
        setTestMsg(`Test sent to ${res.sentTo}`);
        load();
      } catch (err) {
        setTestMsg(err instanceof Error ? err.message : 'Test send failed');
      } finally {
        setTestBusy(false);
      }
    };

    const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const firstStep = sortedSteps[0];
    const eligibleRecipients = recipients.filter((r) => r.recipientStatus === 'subscribed');
    const displayRecipients = eligibleRecipients.length > 0 ? eligibleRecipients : recipients;
    const allChecksPass = preflight?.checks.every((c) => c.ok) ?? false;

    const renderCheck = (check: PreflightCheck) => (
      <div
        key={check.id}
        className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              check.ok ? 'bg-status-success-bg' : 'bg-status-danger-bg'
            }`}
          >
            <MarketingIcon
              name={CHECK_ICONS[check.id] ?? 'info'}
              className={check.ok ? 'text-status-success-text' : 'text-status-danger-text'}
            />
          </div>
          <div className="min-w-0">
            <p className="text-body-lg text-on-surface">{check.label}</p>
            {check.detail && (
              <p className="text-xs text-on-surface-variant truncate">{check.detail}</p>
            )}
          </div>
        </div>
        <MarketingIcon
          name={check.ok ? 'check_circle' : 'cancel'}
          className={check.ok ? 'text-status-success-text' : 'text-status-danger-text'}
        />
      </div>
    );

    return (
      <div className="max-w-container-max-wizard mx-auto">
        {!isAdmin && (
          <div className="rounded-xl border border-primary-border bg-primary-surface px-4 py-3 text-sm text-primary flex items-start gap-2 mb-6">
            <MarketingIcon name="info" className="shrink-0 mt-0.5" />
            <p>
              An administrator must launch this campaign. You can save the draft and send a test
              email to verify formatting.
            </p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-headline-sm text-on-surface">Pre-flight Checklist</h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  allChecksPass
                    ? 'bg-status-success-bg text-status-success-text'
                    : 'bg-status-draft-bg text-status-draft-text'
                }`}
              >
                {allChecksPass ? 'System Ready' : 'Action Required'}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {(preflight?.checks ?? []).map(renderCheck)}
            </div>

            {firstStep && (
              <div className="p-6 border-t border-gray-100">
                <h4 className="text-label-caps text-on-surface-variant mb-3">Sequence preview</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-500 font-data-mono ml-4 truncate">
                      Subject: {firstStep.subject || 'Untitled'}
                    </span>
                  </div>
                  <div className="p-6 text-sm text-on-surface-variant">
                    <p>
                      Hi{' '}
                      <span className="bg-primary-surface text-primary px-2 py-0.5 rounded font-data-mono text-xs">
                        {'{{first_name}}'}
                      </span>
                      ,
                    </p>
                    <p className="mt-3 line-clamp-3">
                      {firstStep.htmlBody.replace(/<[^>]+>/g, ' ').trim() || 'Email body preview…'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-primary text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-white/80 text-label-caps uppercase text-xs mb-1">Target Audience</p>
                <h4 className="text-4xl font-bold mb-4">{recipientSummary.selected}</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-medium backdrop-blur-md">
                    {sortedSteps.length} email{sortedSteps.length === 1 ? '' : 's'}
                  </span>
                  {recipientSummary.suppressed > 0 && (
                    <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-medium backdrop-blur-md">
                      {recipientSummary.suppressed} excluded
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-medium border-b border-white/20 pb-2">Recent recipients</p>
                  {displayRecipients.slice(0, 3).map((r) => (
                    <div key={r.contactId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                        {initials(r.name || r.email)}
                      </div>
                      <div className="text-xs min-w-0">
                        <p className="font-bold truncate">{r.email}</p>
                        <p className="text-white/60 truncate">{r.name}</p>
                      </div>
                    </div>
                  ))}
                  {displayRecipients.length === 0 && (
                    <p className="text-xs text-white/70">No recipients selected yet.</p>
                  )}
                </div>
              </div>
              <MarketingIcon
                name="group"
                className="absolute -right-8 -bottom-8 text-9xl opacity-10"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-headline-sm text-on-surface mb-4">Verification</h3>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Send a full-rendered test of the sequence to your inbox to ensure merge tags and
                formatting are correct.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={sender?.testSentTo ?? 'your@email.com'}
                  className="flex-1 rounded-lg border-gray-200 text-sm focus:ring-primary focus:border-primary px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => void sendTest()}
                  disabled={testBusy}
                  className="bg-surface-container-low border border-primary-border p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  aria-label="Send test"
                >
                  <MarketingIcon name="send" className="text-primary" />
                </button>
              </div>
              {sender?.testSentAt && preflight?.testValid && (
                <div className="flex items-center gap-2 text-status-success-text mb-2">
                  <MarketingIcon name="done_all" className="text-xs" />
                  <span className="text-[11px] font-medium">
                    Last test sent {new Date(sender.testSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {!preflight?.testValid && sender?.testSentAt && (
                <div className="flex items-center gap-2 text-status-danger-text mb-2">
                  <MarketingIcon name="warning" className="text-xs" />
                  <span className="text-[11px] font-medium">
                    Test invalidated — send a new test after changes
                  </span>
                </div>
              )}
              {testMsg && <p className="text-xs text-on-surface-variant">{testMsg}</p>}
            </div>
          </div>

          <div className="col-span-12">
            <div className="bg-surface-container border border-primary-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5 min-w-0">
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center shadow-inner shrink-0">
                  <MarketingIcon name="campaign" className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-headline-sm leading-tight truncate">{campaign.name}</p>
                  <p className="text-on-surface-variant text-sm mt-1">
                    Sending as{' '}
                    <span className="font-bold">
                      {sender?.fromName ?? '—'} &lt;{sender?.fromEmail ?? '—'}&gt;
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="bg-white/50 px-4 py-2 rounded-lg border border-primary-border text-center">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                    Recipients
                  </p>
                  <p className="text-primary font-bold text-lg leading-tight">
                    {recipientSummary.selected}
                  </p>
                </div>
                <div className="bg-white/50 px-4 py-2 rounded-lg border border-primary-border text-center">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                    Steps
                  </p>
                  <p className="text-primary font-bold text-lg leading-tight">{sortedSteps.length}</p>
                </div>
              </div>
            </div>
          </div>

          {sortedSteps.length > 0 && (
            <div className="col-span-12 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-headline-sm text-on-surface">Email schedule</h3>
                <Link
                  href={`/marketing/campaigns/${campaignId}/edit?step=2` as Route}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Edit sequence
                </Link>
              </div>
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-label-caps text-on-surface-variant">
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
            </div>
          )}
        </div>

        <CampaignLaunchModal
          open={launchOpen}
          onClose={() => setLaunchOpen(false)}
          campaignName={campaign.name}
          recipientCount={recipientSummary.selected}
          stepCount={sortedSteps.length}
          firstSendLabel={
            sortedSteps[0]?.sendAt
              ? formatSendAtLabel(sortedSteps[0].sendAt, timezone, 'en')
              : 'Immediate send'
          }
          onConfirm={async () => {
            await api.marketing.campaigns.launch(accountId, campaignId, token);
            onLaunched();
          }}
        />
      </div>
    );
  }
);
