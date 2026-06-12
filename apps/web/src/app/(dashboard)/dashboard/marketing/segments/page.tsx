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

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.segments.list(accountId, token).then((r) => setSegments(r.segments));
  };

  useEffect(load, [token, accountId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    await api.marketing.segments.create(
      accountId,
      {
        name: name.trim(),
        segmentType: type,
        filters: contactType ? { type: contactType, marketingStatus: 'subscribed' } : { marketingStatus: 'subscribed' },
      },
      token
    );
    setName('');
    load();
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader title="Audience segments" description="Static lists and dynamic CRM filters" />
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
            <option value="static">Static (manual members — coming soon)</option>
          </select>
          {type === 'dynamic' && (
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
          )}
          <Button type="submit">Create segment</Button>
        </form>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Segments</h2>
          <ul className="space-y-2 text-sm">
            {segments.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-gray-100 pb-2">
                <span>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-400 ml-2 capitalize">{s.segmentType}</span>
                </span>
                <span className="text-gray-600">{s.contactCount ?? 0}</span>
              </li>
            ))}
            {segments.length === 0 && <p className="text-gray-400">No segments yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
