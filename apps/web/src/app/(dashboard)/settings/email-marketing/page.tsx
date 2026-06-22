'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSender, type ServiceCredential } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
