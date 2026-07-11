'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { FieldMappingEntry } from '@/lib/enrichment-field-schemas';
import { CRM_GOAL_FIELDS } from '@/lib/enrichment-field-schemas';

export type MappingRow = {
  sourceKey: string;
  sourceLabel: string;
  mapping: FieldMappingEntry;
};

type Props = {
  rows: MappingRow[];
  onChange: (sourceKey: string, patch: Partial<FieldMappingEntry>) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

export function FieldMappingGrid({ rows, onChange, onReorder }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const onDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    onReorder(dragIdx, targetIdx);
    setDragIdx(null);
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-2">No mappable fields for this provider.</p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[28px_28px_minmax(140px,1fr)_24px_minmax(140px,1fr)_100px_32px] gap-2 items-center bg-gray-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 border-b border-gray-200">
        <span />
        <span>Use</span>
        <span>Provider field</span>
        <span />
        <span>CRM attribute</span>
        <span>Type</span>
        <span />
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row, idx) => (
          <div
            key={row.sourceKey}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(idx)}
            className="grid grid-cols-[28px_28px_minmax(140px,1fr)_24px_minmax(140px,1fr)_100px_32px] gap-2 items-center px-3 py-2.5 bg-white hover:bg-gray-50/80"
          >
            <button
              type="button"
              className="text-gray-400 cursor-grab active:cursor-grabbing text-sm leading-none"
              aria-label="Drag to reorder"
            >
              ⋮⋮
            </button>
            <input
              type="checkbox"
              checked={row.mapping.enabled !== false}
              onChange={(e) => onChange(row.sourceKey, { enabled: e.target.checked })}
              className="size-4 rounded border-gray-300 text-primary-600"
            />
            <code className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded truncate">
              {row.sourceKey}
            </code>
            <span className="text-gray-400 text-center">→</span>
            <select
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full"
              value={row.mapping.targetKey}
              onChange={(e) => onChange(row.sourceKey, { targetKey: e.target.value })}
            >
              {CRM_GOAL_FIELDS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
              <option value={row.sourceKey}>{row.sourceLabel}</option>
            </select>
            <select
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full"
              value={row.mapping.attrType ?? 'text'}
              onChange={(e) =>
                onChange(row.sourceKey, {
                  attrType: e.target.value as FieldMappingEntry['attrType'],
                })
              }
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="boolean">Boolean</option>
            </select>
            <Input
              className="hidden"
              value={row.mapping.label}
              onChange={(e) => onChange(row.sourceKey, { label: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
