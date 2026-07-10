'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Label, type MarketingSegment } from '@/lib/api';
import { COUNTRY_OPTIONS, countryLabel } from '@/lib/country';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

const BORDER_COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#14B8A6', '#8B5CF6', '#0EA5E9', '#EC4899'];

type FieldKey = 'marketingStatus' | 'labelId' | 'country' | 'type' | 'inactiveDays' | 'hasConversation';

const FIELD_META: { key: FieldKey; label: string }[] = [
  { key: 'labelId', label: 'Label' },
  { key: 'country', label: 'Country' },
  { key: 'type', label: 'Contact type' },
  { key: 'marketingStatus', label: 'Subscription' },
  { key: 'inactiveDays', label: 'Last activity' },
  { key: 'hasConversation', label: 'Has conversation' },
];

type Condition = { field: FieldKey; value: string };

function filtersToConditions(filters: Record<string, unknown> | undefined): Condition[] {
  const f = filters ?? {};
  const out: Condition[] = [];
  if (typeof f.labelId === 'string' && f.labelId) out.push({ field: 'labelId', value: f.labelId });
  if (typeof f.country === 'string' && f.country) out.push({ field: 'country', value: f.country });
  if (typeof f.type === 'string' && f.type) out.push({ field: 'type', value: f.type });
  if (typeof f.marketingStatus === 'string' && f.marketingStatus)
    out.push({ field: 'marketingStatus', value: f.marketingStatus });
  if (typeof f.inactiveDays === 'number')
    out.push({ field: 'inactiveDays', value: String(f.inactiveDays) });
  if (typeof f.hasConversation === 'boolean')
    out.push({ field: 'hasConversation', value: f.hasConversation ? 'yes' : 'no' });
  return out;
}

function conditionsToFilters(conditions: Condition[]): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  for (const c of conditions) {
    if (!c.value) continue;
    if (c.field === 'inactiveDays') filters.inactiveDays = Number(c.value);
    else if (c.field === 'hasConversation') filters.hasConversation = c.value === 'yes';
    else filters[c.field] = c.value;
  }
  return filters;
}

function fieldValueLabel(field: FieldKey, value: string, labels: Label[]): string {
  if (!value) return '';
  if (field === 'labelId') return labels.find((l) => l.id === value)?.name ?? 'label';
  if (field === 'country') return countryLabel(value) ?? value;
  if (field === 'marketingStatus') return value === 'subscribed' ? 'Subscribed' : 'Unsubscribed';
  if (field === 'inactiveDays') return `${value}+ days`;
  if (field === 'hasConversation') return value === 'yes' ? 'Yes' : 'No';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function filterSummary(s: MarketingSegment, labels: Label[]) {
  if (s.segmentType === 'static') return 'Manual member list';
  const conditions = filtersToConditions(s.filters);
  if (!conditions.length) return 'Subscribed contacts';
  return conditions
    .map((c) => `${FIELD_META.find((m) => m.key === c.field)?.label} = ${fieldValueLabel(c.field, c.value, labels)}`)
    .join(' AND ');
}

export function MarketingSegmentsView() {
  const { token, accountId } = useAuthStore();
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'dynamic' | 'static'>('dynamic');
  const [conditions, setConditions] = useState<Condition[]>([{ field: 'marketingStatus', value: 'subscribed' }]);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
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

  useEffect(() => {
    if (!token || !accountId) return;
    api.labels.list(accountId, token).then((r) => setLabels(r.labels));
  }, [token, accountId]);

  useEffect(() => {
    if (!showCreate || type !== 'dynamic' || !token || !accountId) {
      setLiveCount(null);
      return;
    }
    setCounting(true);
    const filters = conditionsToFilters(conditions);
    const timer = setTimeout(() => {
      api.marketing.segments
        .previewFilters(accountId, { segmentType: 'dynamic', filters }, token)
        .then((r) => setLiveCount(r.count))
        .finally(() => setCounting(false));
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreate, type, JSON.stringify(conditions), token, accountId]);

  const availableFields = useMemo(
    () => FIELD_META.filter((m) => !conditions.some((c) => c.field === m.key)),
    [conditions]
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('dynamic');
    setConditions([{ field: 'marketingStatus', value: 'subscribed' }]);
    setLiveCount(null);
  };

  const startCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const startEdit = async (segmentId: string) => {
    if (!token || !accountId) return;
    setBusy(true);
    try {
      const res = await api.marketing.segments.preview(accountId, segmentId, token);
      setEditingId(segmentId);
      setName(res.segment.name);
      setType(res.segment.segmentType);
      setConditions(
        res.segment.segmentType === 'dynamic'
          ? filtersToConditions(res.segment.filters) || [{ field: 'marketingStatus', value: 'subscribed' }]
          : []
      );
      setShowCreate(true);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setBusy(true);
    const filters = type === 'dynamic' ? conditionsToFilters(conditions) : {};

    try {
      if (editingId) {
        await api.marketing.segments.update(
          accountId,
          editingId,
          { name: name.trim(), segmentType: type, filters },
          token
        );
      } else {
        await api.marketing.segments.create(
          accountId,
          { name: name.trim(), segmentType: type, filters },
          token
        );
      }
      resetForm();
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

  const updateCondition = (index: number, patch: Partial<Condition>) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addCondition = () => {
    const next = availableFields[0];
    if (!next) return;
    const defaultValue =
      next.key === 'marketingStatus'
        ? 'subscribed'
        : next.key === 'hasConversation'
          ? 'yes'
          : next.key === 'type'
            ? 'lead'
            : '';
    setConditions((prev) => [...prev, { field: next.key, value: defaultValue }]);
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader
        title="Segments"
        action={
          <button
            type="button"
            onClick={startCreate}
            className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            New segment
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full">
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
                style={{
                  animationDelay: `${i * 50}ms`,
                  borderLeft: `4px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}`,
                }}
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
                <p
                  className="text-3xl font-bold mb-1"
                  style={{ color: BORDER_COLORS[i % BORDER_COLORS.length] }}
                >
                  {s.contactCount ?? 0}
                </p>
                <p className="text-xs text-on-surface-variant mb-3">subscribed contacts</p>
                <p className="text-[11px] text-gray-500 pt-3 border-t border-gray-100 mb-1">
                  <span className="font-semibold text-gray-600">Filters: </span>
                  {filterSummary(s, labels)}
                </p>
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
                    onClick={() => void startEdit(s.id)}
                    className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50"
                  >
                    Edit
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
              onClick={startCreate}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-primary-border hover:text-primary min-h-[200px] transition-colors"
            >
              <MarketingIcon name="add_circle" className="text-4xl mb-2" />
              <span className="text-sm font-semibold">New segment</span>
            </button>
          </div>
        )}

        {showCreate && (
          <form
            onSubmit={submit}
            className="mt-8 bg-white border border-gray-200 rounded-xl p-6 space-y-4 max-w-2xl shadow-sm"
          >
            <h2 className="text-headline-sm text-on-surface">
              {editingId ? 'Edit segment' : 'Create segment'}
            </h2>
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
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Filters — ALL conditions must match
                </p>
                <div className="flex flex-col gap-2">
                  {conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <select
                        value={c.field}
                        onChange={(e) => {
                          const field = e.target.value as FieldKey;
                          const defaultValue =
                            field === 'marketingStatus'
                              ? 'subscribed'
                              : field === 'hasConversation'
                                ? 'yes'
                                : field === 'type'
                                  ? 'lead'
                                  : '';
                          updateCondition(i, { field, value: defaultValue });
                        }}
                        className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-36"
                      >
                        <option value={c.field}>
                          {FIELD_META.find((m) => m.key === c.field)?.label}
                        </option>
                        {availableFields.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>

                      <span className="text-xs text-gray-500">
                        {c.field === 'inactiveDays' ? 'within last' : 'is'}
                      </span>

                      {c.field === 'labelId' && (
                        <select
                          value={c.value}
                          onChange={(e) => updateCondition(i, { value: e.target.value })}
                          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-40"
                        >
                          <option value="">Select label…</option>
                          {labels.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {c.field === 'country' && (
                        <select
                          value={c.value}
                          onChange={(e) => updateCondition(i, { value: e.target.value })}
                          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-40"
                        >
                          <option value="">Select country…</option>
                          {COUNTRY_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {c.field === 'type' && (
                        <select
                          value={c.value}
                          onChange={(e) => updateCondition(i, { value: e.target.value })}
                          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-32"
                        >
                          <option value="lead">Lead</option>
                          <option value="customer">Customer</option>
                          <option value="visitor">Visitor</option>
                        </select>
                      )}
                      {c.field === 'marketingStatus' && (
                        <select
                          value={c.value}
                          onChange={(e) => updateCondition(i, { value: e.target.value })}
                          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-32"
                        >
                          <option value="subscribed">Subscribed</option>
                          <option value="unsubscribed">Unsubscribed</option>
                        </select>
                      )}
                      {c.field === 'hasConversation' && (
                        <select
                          value={c.value}
                          onChange={(e) => updateCondition(i, { value: e.target.value })}
                          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-40"
                        >
                          <option value="yes">Has conversations</option>
                          <option value="no">No conversations</option>
                        </select>
                      )}
                      {c.field === 'inactiveDays' && (
                        <>
                          <input
                            type="number"
                            min={1}
                            value={c.value}
                            onChange={(e) => updateCondition(i, { value: e.target.value })}
                            className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 w-16"
                          />
                          <span className="text-xs text-gray-500">days</span>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => removeCondition(i)}
                        className="text-status-danger-text hover:opacity-70 text-xs ml-auto"
                        aria-label="Remove filter"
                      >
                        <MarketingIcon name="close" className="text-[16px]" />
                      </button>
                    </div>
                  ))}
                </div>
                {availableFields.length > 0 && (
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs font-semibold text-primary hover:underline mt-2"
                  >
                    + Add filter
                  </button>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                  {counting ? (
                    <span className="text-xs text-gray-400">Counting matches…</span>
                  ) : liveCount !== null ? (
                    <span className="bg-status-success-bg text-status-success-text text-sm font-semibold px-3 py-1.5 rounded-lg">
                      ✓ {liveCount} contact{liveCount === 1 ? '' : 's'} match
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="marketing-btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {editingId ? 'Save changes' : 'Create segment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowCreate(false);
                }}
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
