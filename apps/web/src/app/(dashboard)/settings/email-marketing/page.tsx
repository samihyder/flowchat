'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingEmailSignature, type MarketingSender, type ServiceCredential } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MarketingHealthPanel, type MarketingHealthData } from '@/components/marketing/marketing-health-panel';
import { SignatureManagerModal } from '@/components/marketing/settings/signature-manager-modal';
import { LinkSettingModal } from '@/components/marketing/settings/link-setting-modal';
import { DEFAULT_SIGNATURE_HTML, resolveDefaultSignature } from '@/lib/marketing/signatures';

const DEFAULT_CALENDLY_TEMPLATE = '<p><a href="{{calendly_url}}">Book a time on my calendar</a></p>';
const DEFAULT_PORTFOLIO_TEMPLATE = '<p><a href="{{portfolio_url}}">View my portfolio</a></p>';

const domainBadgeColor: Record<string, 'success' | 'warning' | 'gray'> = {
  verified: 'success',
  pending: 'warning',
  failed: 'gray',
  unknown: 'gray',
};

export default function EmailMarketingSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [emailCredentials, setEmailCredentials] = useState<ServiceCredential[]>([]);
  const [credentialId, setCredentialId] = useState('');
  const [doubleOptIn, setDoubleOptIn] = useState(false);
  const [savingOptIn, setSavingOptIn] = useState(false);
  const [message, setMessage] = useState('');

  const [label, setLabel] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [suppressions, setSuppressions] = useState<{ id: string; email: string; reason: string }[]>([]);
  const [suppressEmail, setSuppressEmail] = useState('');

  const [signatures, setSignatures] = useState<MarketingEmailSignature[]>([]);
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingTemplate, setMeetingTemplate] = useState(DEFAULT_CALENDLY_TEMPLATE);
  const [portfolioLink, setPortfolioLink] = useState('');
  const [portfolioTemplate, setPortfolioTemplate] = useState(DEFAULT_PORTFOLIO_TEMPLATE);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [autoAppendTemplates, setAutoAppendTemplates] = useState(true);
  const [savingAutoAppend, setSavingAutoAppend] = useState(false);

  const [health, setHealth] = useState<MarketingHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [processingDue, setProcessingDue] = useState(false);
  const [processDueMessage, setProcessDueMessage] = useState<string | null>(null);

  const load = () => {
    if (!token || !accountId) return;
    setHealthLoading(true);
    api.marketing.senders.list(accountId, token).then((r) => setSenders(r.senders));
    api.serviceCredentials.list(accountId, token, 'email_marketing').then((r) => {
      setEmailCredentials(r.credentials);
      const def = r.credentials.find((c) => c.isDefault);
      if (def) setCredentialId(def.id);
    });
    api.marketing.suppressions.list(accountId, token).then((r) => setSuppressions(r.suppressions));
    api.account.get(accountId, token).then((r) => {
      setDoubleOptIn(Boolean(r.account.settings?.marketingDoubleOptIn));
      const s = r.account.settings ?? {};
      setMeetingLink(s.marketingCalendlyUrl ?? '');
      setMeetingTemplate(s.marketingCalendlyTemplate ?? DEFAULT_CALENDLY_TEMPLATE);
      setPortfolioLink(s.marketingPortfolioUrl ?? '');
      setPortfolioTemplate(s.marketingPortfolioTemplate ?? DEFAULT_PORTFOLIO_TEMPLATE);
      setAutoAppendTemplates(s.marketingAutoAppendTemplates !== false);

      if (s.marketingEmailSignatures?.length) {
        setSignatures(s.marketingEmailSignatures);
      } else {
        // First visit since the multi-signature migration: seed a real default row in the
        // DB (from the legacy single value if one exists) so a default always resolves
        // from stored data, not just a hardcoded fallback.
        const seeded: MarketingEmailSignature = {
          id: crypto.randomUUID(),
          name: 'Default',
          html: s.marketingEmailSignature ?? DEFAULT_SIGNATURE_HTML,
          isDefault: true,
        };
        setSignatures([seeded]);
        void api.account.update(accountId, { settings: { marketingEmailSignatures: [seeded] } }, token);
      }
    });
    api.marketing
      .getHealth(accountId, token)
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setHealthLoading(false));
  };

  useEffect(load, [token, accountId]);

  const createSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setCreating(true);
    setMessage('');
    try {
      await api.marketing.senders.create(
        accountId,
        {
          label: label.trim(),
          fromName: fromName.trim(),
          fromEmail: fromEmail.trim(),
          replyTo: replyTo.trim() || undefined,
          physicalAddress: physicalAddress.trim() || undefined,
          isDefault: senders.length === 0,
          credentialId: credentialId || null,
        },
        token
      );
      setLabel('');
      setFromName('');
      setFromEmail('');
      setReplyTo('');
      setPhysicalAddress('');
      setMessage('Sender added.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add sender');
    } finally {
      setCreating(false);
    }
  };

  const setDefault = async (senderId: string) => {
    if (!token || !accountId) return;
    await api.marketing.senders.update(accountId, senderId, { isDefault: true }, token);
    load();
  };

  const removeSender = async (senderId: string) => {
    if (!token || !accountId || !confirm('Delete this sender?')) return;
    await api.marketing.senders.delete(accountId, senderId, token);
    load();
  };

  const saveDoubleOptIn = async (enabled: boolean) => {
    if (!token || !accountId) return;
    setSavingOptIn(true);
    setDoubleOptIn(enabled);
    await api.account.update(accountId, { settings: { marketingDoubleOptIn: enabled } }, token);
    setSavingOptIn(false);
  };

  const saveMeetingLink = async (url: string, template: string) => {
    if (!token || !accountId) return;
    await api.account.update(
      accountId,
      { settings: { marketingCalendlyUrl: url, marketingCalendlyTemplate: template } },
      token
    );
    setMeetingLink(url);
    setMeetingTemplate(template);
  };

  const savePortfolioLink = async (url: string, template: string) => {
    if (!token || !accountId) return;
    await api.account.update(
      accountId,
      { settings: { marketingPortfolioUrl: url, marketingPortfolioTemplate: template } },
      token
    );
    setPortfolioLink(url);
    setPortfolioTemplate(template);
  };

  const saveAutoAppend = async (enabled: boolean) => {
    if (!token || !accountId) return;
    setSavingAutoAppend(true);
    setAutoAppendTemplates(enabled);
    await api.account.update(accountId, { settings: { marketingAutoAppendTemplates: enabled } }, token);
    setSavingAutoAppend(false);
  };

  const handleProcessDue = async () => {
    if (!token || !accountId) return;
    setProcessingDue(true);
    setProcessDueMessage(null);
    try {
      const res = await api.marketing.processDue(accountId, token);
      setProcessDueMessage(
        res.ok
          ? `Processed ${res.s6mProcessed} due send(s), ${res.s6mSent} sent.`
          : (res.error ?? 'Scheduler failed')
      );
      const h = await api.marketing.getHealth(accountId, token);
      setHealth(h);
    } catch (err) {
      setProcessDueMessage(err instanceof Error ? err.message : 'Scheduler failed');
    } finally {
      setProcessingDue(false);
    }
  };

  const defaultSignature = resolveDefaultSignature({ marketingEmailSignatures: signatures });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Email marketing</h2>
        <p className="text-sm text-gray-500 mt-1">
          Provision multiple senders (from name + verified domain). Campaigns and workflows pick a sender per send.{' '}
          <Link href="/settings/connected-services" className="text-primary-600 hover:underline">
            Manage email provider keys
          </Link>
        </p>
      </div>

      <section className="rounded-xl border-2 border-primary-border bg-primary-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">Process campaign sends</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manually run the email scheduler for all due campaign steps. Use this when cron is
            offline or on preview deployments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleProcessDue()}
          disabled={processingDue}
          className="marketing-btn-primary shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 shadow-sm"
        >
          {processingDue ? 'Processing…' : 'Process due sends now'}
        </button>
      </section>
      {processDueMessage ? (
        <p
          className={`text-sm -mt-4 ${processDueMessage.startsWith('Processed') ? 'text-green-600' : 'text-red-600'}`}
        >
          {processDueMessage}
        </p>
      ) : null}

      <MarketingHealthPanel
        health={health}
        loading={healthLoading}
        onProcessDue={() => void handleProcessDue()}
        processingDue={processingDue}
        processDueMessage={processDueMessage}
      />

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-gray-900">Senders</h3>
        <ul className="space-y-3">
          {senders.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 border border-gray-100 rounded-lg p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{s.label}</p>
                  {s.isDefault && <Badge color="primary">Default</Badge>}
                  <Badge color={domainBadgeColor[s.domainStatus] ?? 'gray'}>{s.domainStatus}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {s.fromName} &lt;{s.fromEmail}&gt;
                </p>
                {s.replyTo && <p className="text-xs text-gray-400">Reply-to: {s.replyTo}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {!s.isDefault && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => void setDefault(s.id)}>
                    Set default
                  </Button>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={() => void removeSender(s.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {senders.length === 0 && (
            <p className="text-sm text-gray-400">No senders yet. Add your first sender below.</p>
          )}
        </ul>
      </section>

      <form onSubmit={createSender} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-gray-900">Add sender</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Newsletter" required />
          </div>
          <div>
            <label className="text-xs text-gray-500">From name</label>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your Company" required />
          </div>
          <div>
            <label className="text-xs text-gray-500">From email (verified with your ESP)</label>
            <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="news@yourdomain.com" type="email" required />
          </div>
          <div>
            <label className="text-xs text-gray-500">Email provider connection</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
            >
              <option value="">Default workspace connection</option>
              {emailCredentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.provider})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Reply-to</label>
            <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@yourdomain.com" type="email" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Physical mailing address (CAN-SPAM footer)</label>
          <textarea
            value={physicalAddress}
            onChange={(e) => setPhysicalAddress(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="123 Main St, City, State, ZIP"
          />
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? 'Adding…' : 'Add sender'}
        </Button>
        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900">Email footer</h3>
          <p className="text-sm text-gray-500 mt-1">
            Appended automatically to every marketing email and automation follow-up.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={autoAppendTemplates}
            disabled={savingAutoAppend}
            onChange={(e) => void saveAutoAppend(e.target.checked)}
          />
          Automatically append the footer to outbound marketing emails
        </label>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Email signatures</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {signatures.length} signature{signatures.length === 1 ? '' : 's'}
                {defaultSignature ? ` — default: ${defaultSignature.name}` : ''}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setSignatureModalOpen(true)}>
              Manage
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Meeting link</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{meetingLink || 'Not set'}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setMeetingModalOpen(true)}>
              Edit
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Portfolio link</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{portfolioLink || 'Not set'}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPortfolioModalOpen(true)}>
              Edit
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Upload your logo under{' '}
          <a href="/settings/account" className="text-primary-600 hover:underline">
            Settings → Account
          </a>{' '}
          to use <code className="text-xs">{'{{logo_url}}'}</code> in a signature.
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-gray-900">Suppression list</h3>
        <div className="flex gap-2">
          <Input value={suppressEmail} onChange={(e) => setSuppressEmail(e.target.value)} placeholder="email@example.com" />
          <Button
            type="button"
            onClick={() => {
              if (!token || !accountId || !suppressEmail.trim()) return;
              void api.marketing.suppressions.add(accountId, suppressEmail.trim(), token).then(() => {
                setSuppressEmail('');
                load();
              });
            }}
          >
            Suppress
          </Button>
        </div>
        <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
          {suppressions.map((s) => (
            <li key={s.id} className="text-gray-600">{s.email} <span className="text-gray-400">({s.reason})</span></li>
          ))}
          {suppressions.length === 0 && <p className="text-gray-400">No suppressed addresses.</p>}
        </ul>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-gray-900">Subscription & compliance</h3>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={doubleOptIn}
            disabled={savingOptIn}
            onChange={(e) => void saveDoubleOptIn(e.target.checked)}
          />
          Require double opt-in before first marketing send
        </label>
        <p className="text-xs text-gray-400">
          Inbound ESP webhooks require a signing secret. Prefer the credential URL from Marketing
          health / Connected Services (<code className="font-mono">/api/webhooks/email/…</code>).
          Platform fallback <code className="font-mono">/api/webhooks/resend</code> only works when{' '}
          <code className="font-mono">RESEND_WEBHOOK_SECRET</code> is set.
        </p>
      </section>

      {signatureModalOpen && token && accountId && (
        <SignatureManagerModal
          accountId={accountId}
          token={token}
          signatures={signatures}
          onChange={setSignatures}
          onClose={() => setSignatureModalOpen(false)}
        />
      )}
      {meetingModalOpen && (
        <LinkSettingModal
          title="Meeting link"
          description="Used in the {{calendly_url}} merge tag."
          urlLabel="Meeting URL"
          urlPlaceholder="https://calendly.com/you/30min"
          mergeTag="{{calendly_url}}"
          initialUrl={meetingLink}
          initialTemplate={meetingTemplate}
          onClose={() => setMeetingModalOpen(false)}
          onSave={saveMeetingLink}
        />
      )}
      {portfolioModalOpen && (
        <LinkSettingModal
          title="Portfolio link"
          description="Used in the {{portfolio_url}} merge tag."
          urlLabel="Portfolio URL"
          urlPlaceholder="https://yoursite.com/portfolio"
          mergeTag="{{portfolio_url}}"
          initialUrl={portfolioLink}
          initialTemplate={portfolioTemplate}
          onClose={() => setPortfolioModalOpen(false)}
          onSave={savePortfolioLink}
        />
      )}
    </div>
  );
}
