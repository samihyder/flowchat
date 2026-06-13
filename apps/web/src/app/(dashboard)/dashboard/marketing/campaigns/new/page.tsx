'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate, type MarketingSegment, type MarketingSender } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewCampaignPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [senderId, setSenderId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [abTest, setAbTest] = useState(false);
  const [subjectVariantB, setSubjectVariantB] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.templates.list(accountId, token),
      api.marketing.segments.list(accountId, token),
      api.marketing.senders.list(accountId, token),
    ]).then(([t, s, snd]) => {
      setTemplates(t.templates);
      setSegments(s.segments);
      setSenders(snd.senders);
      const def = snd.senders.find((x) => x.isDefault);
      if (def) setSenderId(def.id);
    });
  }, [token, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setSaving(true);
    try {
      const res = await api.marketing.campaigns.create(
        accountId,
        {
          name: name.trim(),
          subject: subject.trim(),
          templateId: templateId || undefined,
          segmentId: segmentId || undefined,
          senderId: senderId || undefined,
          scheduledAt: scheduledAt || undefined,
          abTestEnabled: abTest,
          subjectVariantB: abTest ? subjectVariantB.trim() : undefined,
        },
        token
      );
      router.push(`/dashboard/marketing/campaigns/${res.campaign.id}` as Route);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl space-y-4 animate-fade-in">
      <Link href={'/dashboard/marketing/campaigns' as Route} className="text-sm text-primary-600 hover:underline">
        ← Campaigns
      </Link>
      <h1 className="text-lg font-semibold text-gray-900">New email campaign</h1>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" required />
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject (supports {{first_name}})" required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={abTest} onChange={(e) => setAbTest(e.target.checked)} />
          A/B subject test (50/50 split)
        </label>
        {abTest && (
          <Input value={subjectVariantB} onChange={(e) => setSubjectVariantB(e.target.value)} placeholder="Subject variant B" required />
        )}
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <p className="text-xs text-gray-400">Leave schedule empty to save as draft. Cron runs every 5 min.</p>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          required
        >
          <option value="">Select template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="">Default sender</option>
          {senders.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} — {s.fromEmail}
            </option>
          ))}
        </select>
        <select
          value={segmentId}
          onChange={(e) => setSegmentId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          required
        >
          <option value="">Select audience segment</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.contactCount ?? 0} contacts)
            </option>
          ))}
        </select>
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create campaign'}
        </Button>
      </form>
    </div>
  );
}
