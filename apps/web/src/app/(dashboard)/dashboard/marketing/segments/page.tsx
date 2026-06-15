'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSegment } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';

export default function SegmentsPage() {
  const { token, accountId } = useAuthStore();
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'dynamic' | 'static'>('dynamic');
  const [contactType, setContactType] = useState('');
  const [inactiveDays, setInactiveDays] = useState('');
  const [hasConversation, setHasConversation] = useState('');
  const [preview, setPreview] = useState<{ id: string; name: string; email: string }[]>([]);
  const [previewSegmentId, setPreviewSegmentId] = useState<string | null>(null);
  const [memberSegmentId, setMemberSegmentId] = useState('');
  const [memberContactIds, setMemberContactIds] = useState('');

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.segments.list(accountId, token).then((r) => setSegments(r.segments));
  };

  useEffect(load, [token, accountId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    const filters: Record<string, unknown> = { marketingStatus: 'subscribed' };
    if (contactType) filters.type = contactType;
    if (inactiveDays) filters.inactiveDays = Number(inactiveDays);
    if (hasConversation === 'yes') filters.hasConversation = true;
    if (hasConversation === 'no') filters.hasConversation = false;

    await api.marketing.segments.create(
      accountId,
      { name: name.trim(), segmentType: type, filters: type === 'dynamic' ? filters : {} },
      token
    );
    setName('');
    load();
  };

  const showPreview = async (segmentId: string) => {
    if (!token || !accountId) return;
    setPreviewSegmentId(segmentId);
    const res = await api.marketing.segments.preview(accountId, segmentId, token);
    setPreview(res.preview);
  };

  const addMembers = async () => {
    if (!token || !accountId || !memberSegmentId || !memberContactIds.trim()) return;
    const ids = memberContactIds.split(',').map((s) => s.trim()).filter(Boolean);
    await api.marketing.segments.addMembers(accountId, memberSegmentId, ids, token);
    setMemberContactIds('');
    load();
  };

  const stats = useMemo(() => {
    const dynamic = segments.filter((s) => s.segmentType === 'dynamic').length;
    const staticN = segments.filter((s) => s.segmentType === 'static').length;
    const contacts = segments.reduce((n, s) => n + (s.contactCount ?? 0), 0);
    return { total: segments.length, dynamic, staticN, contacts };
  }, [segments]);

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader title="Audience segments" description="Static lists and dynamic CRM filters with preview" />
      <div className="px-6">
        <MetricGrid>
          <MetricCard label="Segments" value={stats.total} accent="neutral" />
          <MetricCard label="Dynamic" value={stats.dynamic} accent="primary" />
          <MetricCard label="Static" value={stats.staticN} accent="amber" />
          <MetricCard label="Total contacts" value={stats.contacts} hint="Across all segments" />
        </MetricGrid>
      </div>
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">New segment</h2>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" required />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'dynamic' | 'static')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="dynamic">Dynamic (filter)</option>
            <option value="static">Static (manual members)</option>
          </select>
          {type === 'dynamic' && (
            <>
              <select
                value={contactType}
                onChange={(e) => setContactType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">All subscribed contacts</option>
                <option value="lead">Leads only</option>
                <option value="customer">Customers only</option>
                <option value="visitor">Visitors only</option>
              </select>
              <Input
                type="number"
                value={inactiveDays}
                onChange={(e) => setInactiveDays(e.target.value)}
                placeholder="Inactive for N+ days (optional)"
              />
              <select
                value={hasConversation}
                onChange={(e) => setHasConversation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">Any conversation history</option>
                <option value="yes">Has conversations</option>
                <option value="no">No conversations</option>
              </select>
            </>
          )}
          <Button type="submit">Create segment</Button>
        </form>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Segments</h2>
            <ul className="space-y-2 text-sm">
              {segments.map((s) => (
                <li key={s.id} className="flex justify-between items-center border-b border-gray-100 pb-2 gap-2">
                  <span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-400 ml-2 capitalize">{s.segmentType}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600">{s.contactCount ?? 0}</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => void showPreview(s.id)}>
                      Preview
                    </Button>
                  </span>
                </li>
              ))}
              {segments.length === 0 && <p className="text-gray-400">No segments yet.</p>}
            </ul>
          </div>

          {previewSegmentId && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-2">Preview (sample)</h3>
              <ul className="text-sm space-y-1">
                {preview.map((c) => (
                  <li key={c.id}>{c.name} · {c.email}</li>
                ))}
                {preview.length === 0 && <p className="text-gray-400">No matching contacts.</p>}
              </ul>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="font-medium text-gray-900">Add static segment members</h3>
            <select
              value={memberSegmentId}
              onChange={(e) => setMemberSegmentId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">Static segment</option>
              {segments.filter((s) => s.segmentType === 'static').map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Input
              value={memberContactIds}
              onChange={(e) => setMemberContactIds(e.target.value)}
              placeholder="Contact IDs (comma-separated)"
            />
            <Button type="button" onClick={() => void addMembers()}>Add members</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
