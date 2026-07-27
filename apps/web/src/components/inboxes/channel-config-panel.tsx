'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { checkboxClass, labelClass } from '@/components/ui/form-field';

type Props = {
  inboxId: string;
  channelType: string;
  accountId: string;
  token: string;
};

type EmailForm = {
  forwardingAddress: string;
  imapHost: string;
  imapPort: string;
  imapUser: string;
  smtpFromEmail: string;
  smtpFromName: string;
  useResendOutbound: boolean;
  credentialId: string;
};

type WhatsAppForm = {
  phoneNumberId: string;
  wabaId: string;
  displayPhone: string;
  verifyToken: string;
  accessToken: string;
  appSecret: string;
};

const emptyEmail = (): EmailForm => ({
  forwardingAddress: '',
  imapHost: '',
  imapPort: '993',
  imapUser: '',
  smtpFromEmail: '',
  smtpFromName: '',
  useResendOutbound: true,
  credentialId: '',
});

const emptyWhatsApp = (): WhatsAppForm => ({
  phoneNumberId: '',
  wabaId: '',
  displayPhone: '',
  verifyToken: '',
  accessToken: '',
  appSecret: '',
});

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function ChannelConfigPanel({ inboxId, channelType, accountId, token }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState<EmailForm>(emptyEmail);
  const [whatsapp, setWhatsapp] = useState<WhatsAppForm>(emptyWhatsApp);
  const [jsonConfig, setJsonConfig] = useState('{}');
  const [healthStatus, setHealthStatus] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      if (channelType === 'email') {
        const res = await api.inboxes.email.get(accountId, inboxId, token);
        const c = res.config ?? {};
        setEmail({
          forwardingAddress: str(c.forwardingAddress),
          imapHost: str(c.imapHost),
          imapPort: c.imapPort != null ? String(c.imapPort) : '993',
          imapUser: str(c.imapUser),
          smtpFromEmail: str(c.smtpFromEmail),
          smtpFromName: str(c.smtpFromName),
          useResendOutbound: c.useResendOutbound !== false,
          credentialId: str(c.credentialId),
        });
      } else if (channelType === 'whatsapp') {
        const res = await api.inboxes.whatsapp.get(accountId, inboxId, token);
        const c = res.config ?? {};
        setWhatsapp({
          phoneNumberId: str(c.phoneNumberId),
          wabaId: str(c.wabaId),
          displayPhone: str(c.displayPhone),
          verifyToken: str(c.verifyToken),
          accessToken: '',
          appSecret: '',
        });
      } else {
        const res = await api.inboxes.channel.get(accountId, inboxId, token);
        const c = res.config ?? {};
        setJsonConfig(JSON.stringify((c.config as Record<string, unknown>) ?? c, null, 2));
        setHealthStatus(str(c.healthStatus) || 'unknown');
      }
    } catch {
      if (channelType === 'email') setEmail(emptyEmail());
      else if (channelType === 'whatsapp') setWhatsapp(emptyWhatsApp());
      else {
        setJsonConfig('{}');
        setHealthStatus('unconfigured');
      }
    } finally {
      setLoading(false);
    }
  }, [token, accountId, inboxId, channelType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (channelType === 'email') {
        await api.inboxes.email.upsert(
          accountId,
          inboxId,
          {
            forwardingAddress: email.forwardingAddress.trim() || null,
            imapHost: email.imapHost.trim() || null,
            imapPort: email.imapPort ? Number(email.imapPort) : null,
            imapUser: email.imapUser.trim() || null,
            smtpFromEmail: email.smtpFromEmail.trim() || null,
            smtpFromName: email.smtpFromName.trim() || null,
            useResendOutbound: email.useResendOutbound,
            credentialId: email.credentialId.trim() || null,
          },
          token
        );
      } else if (channelType === 'whatsapp') {
        const body: Record<string, unknown> = {
          phoneNumberId: whatsapp.phoneNumberId.trim() || null,
          wabaId: whatsapp.wabaId.trim() || null,
          displayPhone: whatsapp.displayPhone.trim() || null,
        };
        if (whatsapp.accessToken.trim()) {
          body.accessToken = whatsapp.accessToken.trim();
        }
        if (whatsapp.appSecret.trim()) {
          body.appSecret = whatsapp.appSecret.trim();
        }
        await api.inboxes.whatsapp.upsert(accountId, inboxId, body, token);
        setWhatsapp((w) => ({ ...w, accessToken: '', appSecret: '' }));
      } else {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(jsonConfig) as Record<string, unknown>;
        } catch {
          setError('Config must be valid JSON.');
          setSaving(false);
          return;
        }
        await api.inboxes.channel.upsert(
          accountId,
          inboxId,
          { channelType, config: parsed },
          token
        );
      }
      setMessage('Channel settings saved.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="mt-3 text-sm text-gray-400">Loading channel config…</p>;
  }

  return (
    <form onSubmit={handleSave} className="mt-3 space-y-4 border-t border-gray-100 pt-4">
      {channelType === 'email' && (
        <>
          <p className="text-xs text-gray-500">
            Email inbox channel — separate from marketing campaigns.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Forwarding address</label>
              <Input
                value={email.forwardingAddress}
                onChange={(e) => setEmail({ ...email, forwardingAddress: e.target.value })}
                placeholder="inbox@yourdomain.com"
              />
            </div>
            <div>
              <label className={labelClass}>IMAP host</label>
              <Input
                value={email.imapHost}
                onChange={(e) => setEmail({ ...email, imapHost: e.target.value })}
                placeholder="imap.example.com"
              />
            </div>
            <div>
              <label className={labelClass}>IMAP port</label>
              <Input
                type="number"
                value={email.imapPort}
                onChange={(e) => setEmail({ ...email, imapPort: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>IMAP user</label>
              <Input
                value={email.imapUser}
                onChange={(e) => setEmail({ ...email, imapUser: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Credential ID</label>
              <Input
                value={email.credentialId}
                onChange={(e) => setEmail({ ...email, credentialId: e.target.value })}
                placeholder="Optional credential UUID"
              />
            </div>
            <div>
              <label className={labelClass}>SMTP from email</label>
              <Input
                type="email"
                value={email.smtpFromEmail}
                onChange={(e) => setEmail({ ...email, smtpFromEmail: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>SMTP from name</label>
              <Input
                value={email.smtpFromName}
                onChange={(e) => setEmail({ ...email, smtpFromName: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={email.useResendOutbound}
              onChange={(e) => setEmail({ ...email, useResendOutbound: e.target.checked })}
            />
            Use Resend for outbound replies
          </label>
        </>
      )}

      {channelType === 'whatsapp' && (
        <>
          <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Meta Cloud API (not WhatsApp CRM sync). This inbox is separate from the WhatsApp CRM
            ecosystem app.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Phone number ID</label>
              <Input
                value={whatsapp.phoneNumberId}
                onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>WABA ID</label>
              <Input
                value={whatsapp.wabaId}
                onChange={(e) => setWhatsapp({ ...whatsapp, wabaId: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Display phone</label>
              <Input
                value={whatsapp.displayPhone}
                onChange={(e) => setWhatsapp({ ...whatsapp, displayPhone: e.target.value })}
                placeholder="+15551234567"
              />
            </div>
            <div>
              <label className={labelClass}>Verify token</label>
              <Input value={whatsapp.verifyToken} readOnly className="bg-gray-50" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Access token <span className="font-normal text-gray-400">(write-only)</span>
              </label>
              <Input
                type="password"
                value={whatsapp.accessToken}
                onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value })}
                placeholder="Paste new token to update"
                autoComplete="new-password"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>
                App secret <span className="font-normal text-gray-400">(required for webhook HMAC)</span>
              </label>
              <Input
                type="password"
                value={whatsapp.appSecret}
                onChange={(e) => setWhatsapp({ ...whatsapp, appSecret: e.target.value })}
                placeholder="Paste Meta app secret to update"
                autoComplete="new-password"
              />
            </div>
          </div>
        </>
      )}

      {channelType !== 'email' && channelType !== 'whatsapp' && (
        <>
          <p className="text-xs text-gray-500">
            Channel health: <span className="font-medium text-gray-700">{healthStatus || 'unknown'}</span>
          </p>
          <div>
            <label className={labelClass}>Channel config (JSON)</label>
            <Textarea
              value={jsonConfig}
              onChange={(e) => setJsonConfig(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save channel'}
        </Button>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
