'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api, type CampaignSenderConfig, type MarketingSender } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';
import { DEFAULT_SIGNATURE_HTML, resolveDefaultSignatureHtml } from '@/lib/marketing/signatures';

export type CampaignSenderStepHandle = {
  /** Returns null on success, or a user-facing error message. */
  save: () => Promise<string | null>;
};

type Props = {
  accountId: string;
  campaignId: string;
  token: string;
  onConfigChange?: (config: Partial<CampaignSenderConfig>) => void;
};

/**
 * Sender/signature/footer are workspace-level settings (Settings → Email marketing) — this
 * step just picks which verified sender a campaign uses and previews what will actually go
 * out. Nothing here is re-typed per campaign; it's all auto-fetched.
 */
export const CampaignSenderStep = forwardRef<CampaignSenderStepHandle, Props>(
  function CampaignSenderStep({ accountId, campaignId, token, onConfigChange }, ref) {
    const [senders, setSenders] = useState<MarketingSender[]>([]);
    const [selectedSenderId, setSelectedSenderId] = useState('');
    const [fromName, setFromName] = useState('');
    const [fromEmail, setFromEmail] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [workspaceSignature, setWorkspaceSignature] = useState(DEFAULT_SIGNATURE_HTML);
    const [meetingLink, setMeetingLink] = useState('');
    const [portfolioLink, setPortfolioLink] = useState('');
    const [physicalAddress, setPhysicalAddress] = useState('');
    const [providerTitle, setProviderTitle] = useState('Resend — Managed Domain');
    const [providerDetail, setProviderDetail] = useState('Verified sender identity');
    const [domainVerified, setDomainVerified] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!token || !accountId) return;
      Promise.all([
        api.marketing.senders.list(accountId, token),
        api.marketing.campaigns.getSender(accountId, campaignId, token),
        api.account.get(accountId, token),
        api.serviceCredentials.list(accountId, token, 'email_marketing'),
      ])
        .then(([sendersRes, senderRes, accountRes, credsRes]) => {
          setSenders(sendersRes.senders);
          const s = senderRes.sender;
          const settings = accountRes.account.settings ?? {};

          // Workspace-level footer content — always auto-fetched, never re-entered here.
          setWorkspaceSignature(resolveDefaultSignatureHtml(settings));
          setMeetingLink(settings.marketingCalendlyUrl ?? '');
          setPortfolioLink(settings.marketingPortfolioUrl ?? '');
          setPhysicalAddress(settings.marketingPhysicalAddress ?? '');

          const match = sendersRes.senders.find(
            (x) => x.fromEmail === s.fromEmail && x.fromName === s.fromName
          );
          const defaultSender = sendersRes.senders.find((x) => x.isDefault) ?? sendersRes.senders[0];
          const selected = match ?? defaultSender;
          setSelectedSenderId(selected?.id ?? '');
          setFromName(selected?.fromName ?? s.fromName ?? settings.marketingFromName ?? '');
          setFromEmail(selected?.fromEmail ?? s.fromEmail ?? settings.marketingFromEmail ?? '');
          setReplyTo(selected?.replyTo ?? s.replyTo ?? '');
          setDomainVerified(selected?.domainStatus === 'verified');

          const cred = credsRes.credentials.find((c) => c.isDefault) ?? credsRes.credentials[0];
          const email = selected?.fromEmail ?? s.fromEmail ?? settings.marketingFromEmail ?? '';
          if (cred) {
            setProviderTitle(`${cred.provider} — Connected`);
            setProviderDetail(cred.label);
          } else {
            setProviderTitle('Resend — Managed Domain');
            setProviderDetail(
              email
                ? `Verified sender identity via ${email.split('@')[1] ?? 'domain'}`
                : 'Platform email provider'
            );
          }
        })
        .finally(() => setLoading(false));
    }, [accountId, campaignId, token]);

    const applySenderSelection = (senderId: string) => {
      setSelectedSenderId(senderId);
      const row = senders.find((s) => s.id === senderId);
      if (!row) return;
      setFromName(row.fromName);
      setFromEmail(row.fromEmail);
      setReplyTo(row.replyTo ?? '');
      setDomainVerified(row.domainStatus === 'verified');
      setProviderDetail(`Verified sender identity via ${row.fromEmail.split('@')[1] ?? 'domain'}`);
    };

    const save = async (): Promise<string | null> => {
      if (!fromEmail.trim()) {
        return 'Add a verified sender in Settings → Email marketing before continuing.';
      }
      try {
        await api.marketing.campaigns.putSender(
          accountId,
          campaignId,
          {
            ...(selectedSenderId ? { senderId: selectedSenderId } : {}),
            // Signature/links are always the workspace defaults now — no per-campaign override.
            useWorkspaceSignature: true,
            signatureHtml: null,
            meetingLink: null,
            portfolioLink: null,
          },
          token
        );
        return null;
      } catch (err) {
        return marketingErrorMessage(err, 'Failed to save sender settings.');
      }
    };

    useImperativeHandle(ref, () => ({ save }), [
      accountId,
      campaignId,
      token,
      selectedSenderId,
      fromEmail,
    ]);

    useEffect(() => {
      onConfigChange?.({
        fromName,
        fromEmail,
        replyTo: replyTo || null,
        useWorkspaceSignature: true,
        signatureHtml: null,
        meetingLink: meetingLink || null,
        portfolioLink: portfolioLink || null,
        credentialId: null,
        testSentAt: null,
        testSentBy: null,
        testSentTo: null,
      });
    }, [fromName, fromEmail, replyTo, meetingLink, portfolioLink, onConfigChange]);

    if (loading) {
      return <p className="text-sm text-gray-400 py-8 text-center">Loading sender settings…</p>;
    }

    const previewPlain = workspaceSignature.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();

    return (
      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-headline-sm text-on-surface mb-1">Sender Information</h3>
            <p className="text-sm text-on-surface-variant">
              Auto-fetched from your connected email provider — how this campaign will appear in
              the recipient&apos;s inbox.
            </p>
          </div>

          {senders.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-2">
              No verified sender configured yet.{' '}
              <Link href={'/settings/email-marketing' as Route} className="font-bold hover:underline">
                Add one in Settings → Email marketing
              </Link>{' '}
              before sending this campaign.
            </div>
          ) : (
            <>
              {senders.length > 1 && (
                <label className="block space-y-2 mb-6">
                  <span className="text-label-caps text-on-surface-variant">VERIFIED SENDER</span>
                  <select
                    value={selectedSenderId}
                    onChange={(e) => applySenderSelection(e.target.value)}
                    className="w-full h-11 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-border focus:border-primary outline-none text-sm"
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — {s.fromEmail}
                        {s.domainStatus === 'verified' ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1">
                  <p className="text-label-caps text-on-surface-variant">From</p>
                  <p className="text-body-md text-on-surface font-medium">
                    {fromName || '—'} <span className="text-on-surface-variant">&lt;{fromEmail}&gt;</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-label-caps text-on-surface-variant">Reply-to</p>
                  <p className="text-body-md text-on-surface font-medium">{replyTo || 'Same as From'}</p>
                </div>
              </div>
            </>
          )}

          <div className="bg-surface-container-low border border-primary-border rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm shrink-0">
              <MarketingIcon name="dns" className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-on-surface">{providerTitle}</h4>
              <p className="text-xs text-on-surface-variant truncate">{providerDetail}</p>
            </div>
            {domainVerified ? (
              <MarketingIcon name="verified" className="text-status-success-text shrink-0" />
            ) : null}
          </div>

          <Link
            href={'/settings/email-marketing' as Route}
            className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 mt-4"
          >
            Manage senders &amp; API connection in settings
            <MarketingIcon name="open_in_new" className="text-[14px]" />
          </Link>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4 flex justify-between items-start gap-4">
            <div>
              <h3 className="text-headline-sm text-on-surface mb-1">Footer &amp; Signature Preview</h3>
              <p className="text-sm text-on-surface-variant">
                Your workspace signature, meeting link, and portfolio link are appended
                automatically — configure them once, they apply to every campaign.
              </p>
            </div>
            <Link
              href={'/settings/email-marketing' as Route}
              className="text-primary text-xs font-bold flex items-center gap-1 hover:underline shrink-0 whitespace-nowrap"
            >
              <MarketingIcon name="edit" className="text-sm" />
              Edit in settings
            </Link>
          </div>

          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-gray-200 text-gray-500 text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
              Email Footer Preview
            </div>
            <div className="mt-4 space-y-4">
              <div className="text-body-md text-on-surface opacity-80 whitespace-pre-wrap">
                {previewPlain || 'Set a signature in Settings → Email marketing.'}
              </div>
              {(meetingLink || portfolioLink) && (
                <div className="text-xs text-primary space-y-1">
                  {meetingLink && <p>Book a call: {meetingLink}</p>}
                  {portfolioLink && <p>Portfolio: {portfolioLink}</p>}
                </div>
              )}
              <div className="pt-6 border-t border-gray-200 space-y-2">
                <p className="text-xs text-gray-400">
                  {physicalAddress || 'Your physical mailing address'}
                </p>
                <p className="text-xs text-gray-400">
                  You received this because you are subscribed to our marketing updates.{' '}
                  <span className="text-primary hover:underline cursor-pointer">Unsubscribe from this list</span>{' '}
                  or <span className="text-primary hover:underline cursor-pointer">Manage preferences</span>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
);
