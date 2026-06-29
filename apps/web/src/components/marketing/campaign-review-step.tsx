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
import { scheduleModeLabel } from '@/lib/marketing/campaign-schedule-time';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';
import { timezoneShortLabel } from '@/lib/timezone';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { CampaignLaunchModal } from '@/components/marketing/campaign-launch-modal';
import {
  AdminLaunchWalkthrough,
  shouldShowLaunchWalkthrough,
} from '@/components/marketing/admin-launch-walkthrough';
import { initials } from '@/components/conversations/conversation-badges';

const CHECK_ICONS: Record<string, string> = {
  provider: 'lan',
  domain: 'verified_user',
  cron: 'update',
  recipients: 'group',
  merge: 'code',
  test: 'mark_email_read',
};

const RECIPIENT_PAGE_SIZE = 8;

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
    const [walkthroughOpen, setWalkthroughOpen] = useState(false);
    const [recipientPage, setRecipientPage] = useState(1);
    const scheduleTimezone = campaign.scheduleTimezone || 'UTC';
    const scheduleMode = campaign.scheduleMode || 'recipient_local';

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
    };

    useEffect(() => {
      load();
    }, [accountId, campaignId, token]);

    useEffect(() => {
      if (isAdmin && shouldShowLaunchWalkthrough()) {
        setWalkthroughOpen(true);
      }
    }, [isAdmin]);

    useImperativeHandle(ref, () => ({
      openLaunch: () => setLaunchOpen(true),
    }));

    const sendTest = async () => {
      const to = testEmail.trim();
      if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        setTestMsg('Enter a valid email address (e.g. you@company.com).');
        return;
      }
      setTestBusy(true);
      setTestMsg('');
      try {
        const res = await api.marketing.campaigns.testSend(
          accountId,
          campaignId,
          token,
          to || undefined
        );
        setTestMsg(`Test sent to ${res.sentTo}`);
        load();
      } catch (err) {
        setTestMsg(marketingErrorMessage(
          err,
          'Test send failed. Check Settings → Email marketing for a verified sender domain and connected email provider.'
        ));
      } finally {
        setTestBusy(false);
      }
    };

    const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const firstStep = sortedSteps[0];
    const eligibleRecipients = recipients.filter((r) => r.recipientStatus === 'subscribed');
    const displayRecipients = eligibleRecipients.length > 0 ? eligibleRecipients : recipients;
    const recipientTotalPages = Math.max(
      1,
      Math.ceil(displayRecipients.length / RECIPIENT_PAGE_SIZE)
    );
    const pagedRecipients = displayRecipients.slice(
      (recipientPage - 1) * RECIPIENT_PAGE_SIZE,
      recipientPage * RECIPIENT_PAGE_SIZE
    );
    const allChecksPass = preflight?.checks.every((c) => c.ok) ?? false;
    const testInvalidated = Boolean(sender?.testSentAt && preflight && !preflight.testValid);

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
      <div className="space-y-6">
        {!isAdmin && (
          <div className="rounded-xl border border-primary-border bg-primary-surface px-4 py-3 text-sm text-primary flex items-start gap-2 mb-6">
            <MarketingIcon name="info" className="shrink-0 mt-0.5" />
            <p>
              An administrator must launch this campaign. You can save the draft and send a test
              email to verify formatting.
            </p>
          </div>
        )}

        {testInvalidated && (
          <div className="bg-status-bounced-bg border-l-4 border-status-bounced-text p-4 rounded-lg flex items-start gap-4 shadow-sm mb-6">
            <MarketingIcon name="warning" className="text-status-bounced-text shrink-0" />
            <div>
              <h3 className="font-bold text-status-bounced-text">Action required: test invalidated</h3>
              <p className="text-sm text-status-bounced-text opacity-90 mt-1">
                Sequence or sender changed after your last test. Send another test email before
                launching to verify deliverability and formatting.
              </p>
            </div>
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
                    : testInvalidated
                      ? 'bg-status-danger-bg text-status-danger-text'
                      : 'bg-status-draft-bg text-status-draft-text'
                }`}
              >
                {allChecksPass ? 'System Ready' : testInvalidated ? 'Invalidated' : 'Action Required'}
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
                      {(firstStep.htmlBody ?? '').replace(/<[^>]+>/g, ' ').trim() ||
                        'Email body preview…'}
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
              {testMsg && (
                <p
                  className={`text-xs ${
                    testMsg.startsWith('Test sent')
                      ? 'text-status-success-text'
                      : 'text-status-danger-text'
                  }`}
                >
                  {testMsg}
                </p>
              )}
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
                <h3 className="text-headline-sm text-on-surface">Sender details</h3>
                <Link
                  href={`/marketing/campaigns/${campaignId}/edit?step=3` as Route}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Edit sender
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-label-caps text-on-surface-variant text-xs mb-1">From</p>
                  <p className="font-medium text-on-surface">
                    {sender?.fromName ?? '—'} &lt;{sender?.fromEmail ?? '—'}&gt;
                  </p>
                </div>
                <div>
                  <p className="text-label-caps text-on-surface-variant text-xs mb-1">Reply-to</p>
                  <p className="text-on-surface-variant">{sender?.replyTo ?? 'Same as sender'}</p>
                </div>
                {(sender?.meetingLink || sender?.portfolioLink) && (
                  <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-primary">
                    {sender.meetingLink ? <span>Meeting: {sender.meetingLink}</span> : null}
                    {sender.portfolioLink ? <span>Portfolio: {sender.portfolioLink}</span> : null}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="col-span-12 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-headline-sm text-on-surface">Campaign recipients</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {recipientSummary.selected} eligible
                  {recipientSummary.suppressed > 0
                    ? ` · ${recipientSummary.suppressed} excluded`
                    : ''}
                </p>
              </div>
              <Link
                href={`/marketing/campaigns/${campaignId}/edit?step=1` as Route}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <MarketingIcon name="edit" className="text-sm" />
                Edit recipients
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-label-caps text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-on-surface-variant">
                        No recipients selected yet.
                      </td>
                    </tr>
                  ) : (
                    pagedRecipients.map((r) => (
                      <tr key={r.contactId}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-surface text-primary text-[10px] font-bold flex items-center justify-center">
                              {initials(r.name || r.email)}
                            </div>
                            <span className="font-medium">{r.name || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-on-surface-variant">{r.email}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              r.recipientStatus === 'subscribed'
                                ? 'bg-status-success-bg text-status-success-text'
                                : 'bg-status-danger-bg text-status-danger-text'
                            }`}
                          >
                            {r.recipientStatus === 'subscribed' ? 'Subscribed' : r.recipientStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {displayRecipients.length > RECIPIENT_PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-on-surface-variant">
                <span>
                  Showing {(recipientPage - 1) * RECIPIENT_PAGE_SIZE + 1}–
                  {Math.min(recipientPage * RECIPIENT_PAGE_SIZE, displayRecipients.length)} of{' '}
                  {displayRecipients.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={recipientPage <= 1}
                    onClick={() => setRecipientPage((p) => p - 1)}
                    className="px-2 py-1 border border-gray-200 rounded bg-white disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={recipientPage >= recipientTotalPages}
                    onClick={() => setRecipientPage((p) => p + 1)}
                    className="px-2 py-1 border border-gray-200 rounded bg-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {sortedSteps.length > 0 && (
            <div className="col-span-12 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-headline-sm text-on-surface">Email schedule</h3>
                <Link
                  href={`/marketing/campaigns/${campaignId}/edit?step=2` as Route}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Edit sequence
                </Link>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {scheduleModeLabel(scheduleMode)} · Times in {timezoneShortLabel(scheduleTimezone)}
              </p>
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
                            ? formatSendAtLabel(step.sendAt, 'en', scheduleTimezone)
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
              ? formatSendAtLabel(sortedSteps[0].sendAt, 'en', scheduleTimezone)
              : 'Immediate send'
          }
          onConfirm={async () => {
            await api.marketing.campaigns.launch(accountId, campaignId, token);
            onLaunched();
          }}
        />

        <AdminLaunchWalkthrough
          open={walkthroughOpen}
          onClose={() => setWalkthroughOpen(false)}
        />
      </div>
    );
  }
);
