'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSegment } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [showCreate, setShowCreate] = useState(false);

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
    setShowCreate(false);
    load();
  };

  const removeSegment = async (segmentId: string) => {
    if (!token || !accountId || !confirm('Delete this segment?')) return;
    await api.marketing.segments.delete(accountId, segmentId, token);
    load();
  };

  const filterSummary = (s: MarketingSegment) => {
    if (s.segmentType === 'static') return 'Manual member list';
    const f = s.filters ?? {};
    const parts: string[] = [];
    if (f.type) parts.push(String(f.type));
    if (f.inactiveDays) parts.push(`inactive ${f.inactiveDays}d+`);
    if (f.hasConversation === true) parts.push('has chats');
    if (f.hasConversation === false) parts.push('no chats');
    return parts.length ? parts.join(' · ') : 'Subscribed contacts';
  };

  const showPreview = async (segmentId: string) => {
    if (!token || !accountId) return;
    setPreviewSegmentId(segmentId);
    const res = await api.marketing.segments.preview(accountId, segmentId, token);
    setPreview(res.preview);
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Segments"
        description="Dynamic contact groups · auto-refresh on send"
        action={
          <Button type="button" onClick={() => setShowCreate(true)}>
            + New segment
          </Button>
        }
      />
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {segments.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-gray-200 rounded-xl p-4 border-l-4 border-l-primary-500 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    s.segmentType === 'dynamic' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {s.segmentType}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{s.contactCount ?? 0}</p>
              <p className="text-xs text-gray-500 mb-3">{filterSummary(s)}</p>
              <p className="text-[11px] text-gray-400 mb-3">
                Created {new Date(s.createdAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void showPreview(s.id)}>
                  Preview
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => void removeSegment(s.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 min-h-[180px]"
          >
            <span className="text-2xl mb-2">+</span>
            <span className="text-sm font-medium">New segment</span>
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={create}
            className="mt-6 bg-white border border-gray-200 rounded-xl p-5 space-y-3 max-w-lg"
          >
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
            <div className="flex gap-2">
              <Button type="submit">Create segment</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {previewSegmentId && (
          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 max-w-lg">
            <h3 className="font-medium text-gray-900 mb-2">Preview (sample)</h3>
            <ul className="text-sm space-y-1">
              {preview.map((c) => (
                <li key={c.id}>
                  {c.name} · {c.email}
                </li>
              ))}
              {preview.length === 0 && <p className="text-gray-400">No matching contacts.</p>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
