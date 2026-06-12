'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EmailMarketingSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !accountId) return;
    api.account.get(accountId, token).then((r) => {
      const s = r.account.settings ?? {};
      setFromName(s.marketingFromName ?? '');
      setFromEmail(s.marketingFromEmail ?? '');
      setReplyTo(s.marketingReplyTo ?? '');
      setPhysicalAddress(s.marketingPhysicalAddress ?? '');
    });
  }, [token, accountId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setSaving(true);
    setMessage('');
    try {
      await api.account.update(
        accountId,
        {
          settings: {
            marketingFromName: fromName.trim() || undefined,
            marketingFromEmail: fromEmail.trim() || undefined,
            marketingReplyTo: replyTo.trim() || undefined,
            marketingPhysicalAddress: physicalAddress.trim() || undefined,
          },
        },
        token
      );
      setMessage('Email marketing settings saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Email marketing — Sender</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure from name, reply-to, and compliance footer. Use a domain verified in Resend.
        </p>
      </div>
      <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-500">From name</label>
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your Company" />
        </div>
        <div>
          <label className="text-xs text-gray-500">From email (verified domain)</label>
          <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="news@yourdomain.com" type="email" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Reply-to</label>
          <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@yourdomain.com" type="email" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Physical mailing address (CAN-SPAM footer)</label>
          <textarea
            value={physicalAddress}
            onChange={(e) => setPhysicalAddress(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="123 Main St, City, State, ZIP"
          />
        </div>
        <p className="text-xs text-gray-400">
          Webhook URL for Resend events: <code className="font-mono">/api/webhooks/resend</code>
        </p>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}
