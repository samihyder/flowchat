'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSegment } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

function filterSummary(s: MarketingSegment) {
  if (s.segmentType === 'static') return 'Manual member list';
  const f = s.filters ?? {};
  const parts: string[] = [];
  if (f.type) parts.push(String(f.type));
  if (f.inactiveDays) parts.push(`inactive ${f.inactiveDays}d+`);
  if (f.hasConversation === true) parts.push('has chats');
  if (f.hasConversation === false) parts.push('no chats');
  return parts.length ? parts.join(' · ') : 'Subscribed contacts';
}

export function MarketingSegmentsView() {
  const { token, accountId } = useAuthStore();
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState<'dynamic' | 'static'>('dynamic');
  const [contactType, setContactType] = useState('');
  const [inactiveDays, setInactiveDays] = useState('');
  const [hasConversation, setHasConversation] = useState('');
  const [preview, setPreview] = useState<{ id: string; name: string; email: string }[]>([]);
  const [previewSegmentId, setPreviewSegmentId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!token || !accountId) return;
    setLoading(true);
    api.marketing.segments
      .list(accountId, token)
      .then((r) => setSegments(r.segments))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, accountId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setBusy(true);
    const filters: Record<string, unknown> = { marketingStatus: 'subscribed' };
    if (contactType) filters.type = contactType;
    if (inactiveDays) filters.inactiveDays = Number(inactiveDays);
    if (hasConversation === 'yes') filters.hasConversation = true;
    if (hasConversation === 'no') filters.hasConversation = false;

    try {
      await api.marketing.segments.create(
        accountId,
        { name: name.trim(), segmentType: type, filters: type === 'dynamic' ? filters : {} },
        token
      );
      setName('');
      setShowCreate(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const removeSegment = async (segmentId: string) => {
    if (!token || !accountId || !confirm('Delete this segment?')) return;
    setBusy(true);
    try {
      await api.marketing.segments.delete(accountId, segmentId, token);
      if (previewSegmentId === segmentId) {
        setPreviewSegmentId(null);
        setPreview([]);
      }
      load();
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async (segmentId: string) => {
    if (!token || !accountId) return;
    setPreviewSegmentId(segmentId);
    const res = await api.marketing.segments.preview(accountId, segmentId, token);
    setPreview(res.preview);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <MarketingPageHeader
        title="Segments"
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            New segment
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-8 max-w-container-max-list mx-auto w-full">
        <header className="mb-8">
          <h2 className="text-headline-lg text-on-surface mb-2">Audience segments</h2>
          <p className="text-on-surface-variant max-w-2xl text-sm">
            Build dynamic contact groups from CRM data. Import segments into campaigns or preview
            membership before sending.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-gray-400">Loading segments…</p>
        ) : (
          <div className="marketing-bento-grid">
            {segments.map((s, i) => (
              <article
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary-border transition-all duration-300 animate-marketing-stagger-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary-surface text-primary flex items-center justify-center shrink-0">
                      <MarketingIcon name="groups" className="text-[22px]" />
                    </div>
                    <h3 className="font-semibold text-on-surface truncate">{s.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      s.segmentType === 'dynamic'
                        ? 'bg-primary-surface text-primary'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.segmentType}
                  </span>
                </div>
                <p className="text-3xl font-bold text-on-surface mb-1">{s.contactCount ?? 0}</p>
                <p className="text-xs text-on-surface-variant mb-1">contacts</p>
                <p className="text-xs text-gray-500 mb-4">{filterSummary(s)}</p>
                <p className="text-[11px] text-gray-400 mb-4">
                  Created {new Date(s.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void showPreview(s.id)}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeSegment(s.id)}
                    className="text-xs text-gray-500 hover:text-status-danger-text disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-primary-border hover:text-primary min-h-[200px] transition-colors"
            >
              <MarketingIcon name="add_circle" className="text-4xl mb-2" />
              <span className="text-sm font-semibold">New segment</span>
            </button>
          </div>
        )}

        {showCreate && (
          <form
            onSubmit={create}
            className="mt-8 bg-white border border-gray-200 rounded-xl p-6 space-y-4 max-w-lg shadow-sm"
          >
            <h2 className="text-headline-sm text-on-surface">Create segment</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Segment name"
              required
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary-border"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'dynamic' | 'static')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="dynamic">Dynamic (filter)</option>
              <option value="static">Static (manual members)</option>
            </select>
            {type === 'dynamic' && (
              <div className="space-y-3">
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
                <input
                  type="number"
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  placeholder="Inactive for N+ days (optional)"
                  className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
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
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="marketing-btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                Create segment
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {previewSegmentId && (
          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 max-w-lg shadow-sm">
            <h3 className="text-headline-sm text-on-surface mb-3 flex items-center gap-2">
              <MarketingIcon name="preview" className="text-primary" />
              Preview sample
            </h3>
            <ul className="text-sm space-y-2">
              {preview.map((c) => (
                <li key={c.id} className="flex justify-between gap-2 border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className="text-gray-500 font-data-mono text-xs">{c.email}</span>
                </li>
              ))}
              {preview.length === 0 && (
                <p className="text-gray-400 text-sm">No matching contacts.</p>
              )}
            </ul>
          </div>
        )}
      </div>

      <MarketingListFooter />
    </div>
  );
}
