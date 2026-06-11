'use client';

import type { Label } from '@/lib/api';

const STATUSES = ['open', 'pending', 'snoozed', 'resolved'] as const;
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

export type ConversationFilters = {
  status: string;
  filter: '' | 'mine' | 'unassigned';
  priority: string;
  labelId: string;
  from: string;
  to: string;
};

type Props = {
  filters: ConversationFilters;
  labels: Label[];
  onChange: (filters: ConversationFilters) => void;
};

export function ConversationFilterBar({ filters, labels, onChange }: Props) {
  return (
    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80 space-y-2 shrink-0">
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ ...filters, status: s })}
            className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
              filters.status === s
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['', 'All'],
            ['mine', 'Mine'],
            ['unassigned', 'Unassigned'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => onChange({ ...filters, filter: value })}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              filters.filter === value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
        <select
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filters.labelId}
          onChange={(e) => onChange({ ...filters, labelId: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white max-w-[120px]"
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
          title="From date"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
          title="To date"
        />
      </div>
    </div>
  );
}
