'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api, type CampaignSenderConfig, type MarketingSender } from '@/lib/api';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';

const DEFAULT_SIGNATURE = `<p>Best regards,</p><p><strong>{{sender_name}}</strong><br/>{{company_name}}</p>`;

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

export const CampaignSenderStep = forwardRef<CampaignSenderStepHandle, Props>(
  function CampaignSenderStep({ accountId, campaignId, token, onConfigChange }, ref) {
    const [senders, setSenders] = useState<MarketingSender[]>([]);
    const [selectedSenderId, setSelectedSenderId] = useState('');
    const [fromName, setFromName] = useState('');
    const [fromEmail, setFromEmail] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [useWorkspaceSignature, setUseWorkspaceSignature] = useState(true);
    const [signatureHtml, setSignatureHtml] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [portfolioLink, setPortfolioLink] = useState('');
    const [workspaceSignature, setWorkspaceSignature] = useState(DEFAULT_SIGNATURE);
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
          setFromName(s.fromName ?? accountRes.account.settings?.marketingFromName ?? '');
          setFromEmail(s.fromEmail ?? accountRes.account.settings?.marketingFromEmail ?? '');
          setReplyTo(s.replyTo ?? '');
          setUseWorkspaceSignature(s.useWorkspaceSignature);
          setSignatureHtml(
            s.signatureHtml ?? accountRes.account.settings?.marketingEmailSignature ?? DEFAULT_SIGNATURE
          );
          setMeetingLink(s.meetingLink ?? accountRes.account.settings?.marketingCalendlyUrl ?? '');
          setPortfolioLink(s.portfolioLink ?? accountRes.account.settings?.marketingPortfolioUrl ?? '');
          setWorkspaceSignature(
            accountRes.account.settings?.marketingEmailSignature ?? DEFAULT_SIGNATURE
          );
          setPhysicalAddress(accountRes.account.settings?.marketingPhysicalAddress ?? '');

          const match = sendersRes.senders.find(
            (x) => x.fromEmail === s.fromEmail && x.fromName === s.fromName
          );
          const defaultSender = sendersRes.senders.find((x) => x.isDefault) ?? sendersRes.senders[0];
          const selected = match ?? defaultSender;
          setSelectedSenderId(selected?.id ?? '');
          setDomainVerified(selected?.domainStatus === 'verified');

          const cred = credsRes.credentials.find((c) => c.isDefault) ?? credsRes.credentials[0];
          const email = s.fromEmail ?? accountRes.account.settings?.marketingFromEmail ?? '';
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

    const autoGenerateSignature = () => {
      const name = fromName.trim() || 'Your Name';
      const company = 'FlowChat';
      const generated = `<p>Best regards,</p><p><strong>${name}</strong><br/>${company}</p>`;
      setUseWorkspaceSignature(false);
      setSignatureHtml(generated);
    };

    const save = async (): Promise<string | null> => {
      if (!fromEmail.trim()) {
        return 'From email is required before continuing.';
      }
      if (!useWorkspaceSignature && !signatureHtml.replace(/<[^>]+>/g, '').trim()) {
        return 'Add a signature or enable the workspace default signature.';
      }
      try {
        await api.marketing.campaigns.putSender(
          accountId,
          campaignId,
          {
            ...(selectedSenderId ? { senderId: selectedSenderId } : {}),
            fromName,
            fromEmail,
            replyTo: replyTo || null,
            ...(useWorkspaceSignature ? {} : { signatureHtml }),
            useWorkspaceSignature,
            meetingLink: meetingLink || null,
            portfolioLink: portfolioLink || null,
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
      fromName,
      fromEmail,
      replyTo,
      useWorkspaceSignature,
      signatureHtml,
      meetingLink,
      portfolioLink,
    ]);

    useEffect(() => {
      onConfigChange?.({
        fromName,
        fromEmail,
        replyTo: replyTo || null,
        useWorkspaceSignature,
        signatureHtml: useWorkspaceSignature ? null : signatureHtml,
        meetingLink: meetingLink || null,
        portfolioLink: portfolioLink || null,
        credentialId: null,
        testSentAt: null,
        testSentBy: null,
        testSentTo: null,
      });
    }, [
      fromName,
      fromEmail,
      replyTo,
      useWorkspaceSignature,
      signatureHtml,
      meetingLink,
      portfolioLink,
      onConfigChange,
    ]);

    if (loading) {
      return <p className="text-sm text-gray-400 py-8 text-center">Loading sender settings…</p>;
    }

    const previewSignature = useWorkspaceSignature ? workspaceSignature : signatureHtml;
    const previewPlain = previewSignature.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();

    return (
      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-headline-sm text-on-surface mb-1">Sender Information</h3>
            <p className="text-sm text-on-surface-variant">
              Configure how your emails appear in the recipient&apos;s inbox.
            </p>
          </div>

          {senders.length > 0 && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-label-caps text-on-surface-variant">FROM NAME</label>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full h-11 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-border focus:border-primary outline-none text-body-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-label-caps text-on-surface-variant">FROM EMAIL</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full h-11 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-border focus:border-primary outline-none text-body-md"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-label-caps text-on-surface-variant">REPLY-TO (OPTIONAL)</label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full h-11 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-border focus:border-primary outline-none text-body-md"
              />
            </div>
          </div>

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
            Manage senders in settings
            <MarketingIcon name="open_in_new" className="text-[14px]" />
          </Link>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6 flex justify-between items-end gap-4">
            <div>
              <h3 className="text-headline-sm text-on-surface mb-1">Email Signature</h3>
              <p className="text-sm text-on-surface-variant">
                Personalize your outreach with a professional signature.
              </p>
            </div>
            <button
              type="button"
              onClick={autoGenerateSignature}
              className="text-primary text-xs font-bold flex items-center gap-1 hover:underline shrink-0"
            >
              <MarketingIcon name="auto_fix" className="text-sm" />
              Auto-Generate
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
            <input
              type="checkbox"
              checked={useWorkspaceSignature}
              onChange={(e) => setUseWorkspaceSignature(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Use workspace default signature
          </label>

          {!useWorkspaceSignature && (
            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-border transition-all">
              <EmailRichEditor
                value={signatureHtml}
                onChange={setSignatureHtml}
                minHeight="192px"
                placeholder="Your email signature…"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              <label className="text-label-caps text-on-surface-variant">MEETING LINK</label>
              <input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://calendly.com/…"
                className="w-full h-11 px-4 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-label-caps text-on-surface-variant">PORTFOLIO LINK</label>
              <input
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="https://…"
                className="w-full h-11 px-4 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-border"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-headline-sm text-on-surface mb-1">Compliance &amp; Footer Preview</h3>
            <p className="text-sm text-on-surface-variant">
              Mandatory legal footer as required by CAN-SPAM / GDPR.
            </p>
          </div>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-gray-200 text-gray-500 text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
              Email Footer Preview
            </div>
            <div className="mt-4 space-y-4">
              <div className="text-body-md text-on-surface opacity-80 whitespace-pre-wrap">
                {previewPlain || 'Your signature will appear here.'}
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
