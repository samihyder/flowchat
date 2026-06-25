'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api, type CampaignSenderConfig, type MarketingSender } from '@/lib/api';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

const DEFAULT_SIGNATURE = `<p>Best regards,</p><p><strong>{{sender_name}}</strong><br/>{{company_name}}</p>`;

export type CampaignSenderStepHandle = {
  save: () => Promise<boolean>;
};

type Props = {
  accountId: string;
  campaignId: string;
  token: string;
};

export const CampaignSenderStep = forwardRef<CampaignSenderStepHandle, Props>(
  function CampaignSenderStep({ accountId, campaignId, token }, ref) {
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
    const [providerLabel, setProviderLabel] = useState('Platform Resend');
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
          setSelectedSenderId(match?.id ?? defaultSender?.id ?? '');

          const cred = credsRes.credentials.find((c) => c.isDefault) ?? credsRes.credentials[0];
          if (cred) {
            setProviderLabel(`Connected ${cred.provider} (${cred.label})`);
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
    };

    const save = async (): Promise<boolean> => {
      try {
        await api.marketing.campaigns.putSender(
          accountId,
          campaignId,
          {
            senderId: selectedSenderId || null,
            fromName,
            fromEmail,
            replyTo: replyTo || null,
            signatureHtml: useWorkspaceSignature ? null : signatureHtml,
            useWorkspaceSignature,
            meetingLink: meetingLink || null,
            portfolioLink: portfolioLink || null,
          },
          token
        );
        return true;
      } catch {
        return false;
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

    if (loading) {
      return <p className="text-sm text-gray-400 py-8 text-center">Loading sender settings…</p>;
    }

    const previewSignature = useWorkspaceSignature ? workspaceSignature : signatureHtml;

    return (
      <div className="max-w-[1024px] mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sender &amp; signature</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose who emails come from and preview how your signature appears.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MarketingIcon name="send" className="text-primary" />
              Sender identity
            </h3>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified sender
              </span>
              <select
                value={selectedSenderId}
                onChange={(e) => applySenderSelection(e.target.value)}
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary-border focus:border-primary"
              >
                <option value="">Custom / manual</option>
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.fromEmail}
                    {s.domainStatus === 'verified' ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                From name
              </span>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2.5"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                From email
              </span>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2.5"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reply-to (optional)
              </span>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2.5"
              />
            </label>

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
              <MarketingIcon name="dns" className="text-gray-400" />
              <span>
                Sending via <strong>{providerLabel}</strong>
              </span>
            </div>

            <Link
              href={'/settings/email-marketing' as Route}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Manage senders in settings
              <MarketingIcon name="open_in_new" className="text-[14px]" />
            </Link>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MarketingIcon name="draw" className="text-primary" />
              Signature
            </h3>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={useWorkspaceSignature}
                onChange={(e) => setUseWorkspaceSignature(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Use workspace default signature
            </label>

            {!useWorkspaceSignature && (
              <EmailRichEditor
                value={signatureHtml}
                onChange={setSignatureHtml}
                minHeight="140px"
                placeholder="Your email signature…"
              />
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meeting link
              </span>
              <input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://calendly.com/…"
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2.5"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Portfolio link
              </span>
              <input
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2.5"
              />
            </label>
          </section>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Email preview</h3>
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 text-sm space-y-3">
            <p className="text-gray-600">Hi Alex,</p>
            <p className="text-gray-500 italic">[Email body content]</p>
            <div
              className="border-t border-gray-200 pt-3 text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewSignature }}
            />
            {meetingLink && (
              <p className="text-primary text-xs">
                <a href={meetingLink}>Book a meeting</a>
              </p>
            )}
            {portfolioLink && (
              <p className="text-primary text-xs">
                <a href={portfolioLink}>View portfolio</a>
              </p>
            )}
            <div className="border-t border-dashed border-gray-300 pt-3 text-xs text-gray-400">
              {physicalAddress || 'Physical mailing address'} ·{' '}
              <span className="underline">Unsubscribe</span>
            </div>
          </div>
        </section>
      </div>
    );
  }
);
