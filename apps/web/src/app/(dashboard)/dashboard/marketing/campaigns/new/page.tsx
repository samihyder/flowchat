'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate, type MarketingSegment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewCampaignPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.templates.list(accountId, token),
      api.marketing.segments.list(accountId, token),
    ]).then(([t, s]) => {
      setTemplates(t.templates);
      setSegments(s.segments);
    });
  }, [token, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setSaving(true);
    try {
      const res = await api.marketing.campaigns.create(
        accountId,
        { name: name.trim(), subject: subject.trim(), templateId: templateId || undefined, segmentId: segmentId || undefined },
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
