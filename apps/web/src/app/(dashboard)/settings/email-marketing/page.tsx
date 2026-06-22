'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSender, type ServiceCredential } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';

const DEFAULT_SIGNATURE = `<p>Best regards,</p>
<p><img src="{{logo_url}}" alt="{{company_name}}" width="72" height="72" style="border-radius:8px" /></p>
<p><strong>{{sender_name}}</strong><br/>{{company_name}}<br/><a href="mailto:{{sender_email}}">{{sender_email}}</a></p>`;
const DEFAULT_CALENDLY = '<p><a href="{{calendly_url}}">Book a time on my calendar</a></p>';
const DEFAULT_PORTFOLIO = '<p><a href="{{portfolio_url}}">View my portfolio</a></p>';

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

  const [emailSignature, setEmailSignature] = useState(DEFAULT_SIGNATURE);
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [calendlyTemplate, setCalendlyTemplate] = useState(DEFAULT_CALENDLY);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioTemplate, setPortfolioTemplate] = useState(DEFAULT_PORTFOLIO);
  const [autoAppendTemplates, setAutoAppendTemplates] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');

  const load = () => {
    if (!token || !accountId) return;
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
      setEmailSignature(s.marketingEmailSignature ?? DEFAULT_SIGNATURE);
      setCalendlyUrl(s.marketingCalendlyUrl ?? '');
      setCalendlyTemplate(s.marketingCalendlyTemplate ?? DEFAULT_CALENDLY);
      setPortfolioUrl(s.marketingPortfolioUrl ?? '');
      setPortfolioTemplate(s.marketingPortfolioTemplate ?? DEFAULT_PORTFOLIO);
      setAutoAppendTemplates(s.marketingAutoAppendTemplates !== false);
    });
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

  const saveEmailTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setSavingTemplates(true);
    setTemplateMessage('');
    try {
      await api.account.update(
        accountId,
        {
          settings: {
            marketingEmailSignature: emailSignature.trim() || undefined,
            marketingCalendlyUrl: calendlyUrl.trim() || undefined,
            marketingCalendlyTemplate: calendlyTemplate.trim() || undefined,
            marketingPortfolioUrl: portfolioUrl.trim() || undefined,
            marketingPortfolioTemplate: portfolioTemplate.trim() || undefined,
            marketingAutoAppendTemplates: autoAppendTemplates,
          },
        },
        token
      );
      setTemplateMessage('Email templates saved. They will be added automatically to automations and campaigns.');
    } catch (err) {
      setTemplateMessage(err instanceof Error ? err.message : 'Failed to save templates');
    } finally {
      setSavingTemplates(false);
    }
  };

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

      <form onSubmit={saveEmailTemplates} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <h3 className="font-medium text-gray-900">Auto email footer templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            Signature, Calendly, and portfolio links are appended automatically to every marketing email and
            automation follow-up. Use merge tags:{' '}
            <code className="text-xs">{'{{logo_url}}'}</code>,{' '}
            <code className="text-xs">{'{{company_name}}'}</code>,{' '}
            <code className="text-xs">{'{{sender_name}}'}</code>,{' '}
            <code className="text-xs">{'{{sender_email}}'}</code>,{' '}
            <code className="text-xs">{'{{calendly_url}}'}</code>,{' '}
            <code className="text-xs">{'{{portfolio_url}}'}</code>,{' '}
            <code className="text-xs">{'{{first_name}}'}</code>.
          </p>
          <p className="text-sm text-gray-500">
            Upload your logo under{' '}
            <a href="/settings/account" className="text-primary-600 hover:underline">
              Settings → Account
            </a>{' '}
            first, then use <code className="text-xs">{'{{logo_url}}'}</code> in the signature below.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={autoAppendTemplates}
            onChange={(e) => setAutoAppendTemplates(e.target.checked)}
          />
          Automatically append templates to outbound marketing emails
        </label>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Signature</label>
          <EmailRichEditor value={emailSignature} onChange={setEmailSignature} minHeight="120px" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Calendly URL</label>
            <Input
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/you/30min"
              type="url"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Portfolio URL</label>
            <Input
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yoursite.com/portfolio"
              type="url"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Calendly link template</label>
          <EmailRichEditor value={calendlyTemplate} onChange={setCalendlyTemplate} minHeight="80px" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Portfolio link template</label>
          <EmailRichEditor value={portfolioTemplate} onChange={setPortfolioTemplate} minHeight="80px" />
        </div>

        <Button type="submit" disabled={savingTemplates}>
          {savingTemplates ? 'Saving…' : 'Save email templates'}
        </Button>
        {templateMessage && (
          <p className={`text-sm ${templateMessage.startsWith('Email templates saved') ? 'text-green-600' : 'text-red-600'}`}>
            {templateMessage}
          </p>
        )}
      </form>

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
          Resend webhook: <code className="font-mono">/api/webhooks/resend</code>
        </p>
      </section>
    </div>
  );
}
