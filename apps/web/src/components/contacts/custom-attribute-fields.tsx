'use client';

import type { CustomAttributeDefinition } from '@/lib/api';
import { Input } from '@/components/ui/input';

type Props = {
  definitions: CustomAttributeDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
};

export function CustomAttributeFields({ definitions, values, onChange }: Props) {
  if (definitions.length === 0) return null;

  const set = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <h3 className="text-sm font-medium text-gray-700">Custom attributes</h3>
      {definitions.map((def) => (
        <div key={def.id}>
          <label className="text-xs text-gray-500">{def.label}</label>
          {def.attrType === 'boolean' ? (
            <select
              value={values[def.key] === true ? 'true' : values[def.key] === false ? 'false' : ''}
              onChange={(e) =>
                set(def.key, e.target.value === '' ? '' : e.target.value === 'true')
              }
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : def.attrType === 'select' ? (
            <select
              value={String(values[def.key] ?? '')}
              onChange={(e) => set(def.key, e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">—</option>
              {(def.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={def.attrType === 'number' ? 'number' : def.attrType === 'date' ? 'date' : 'text'}
              value={String(values[def.key] ?? '')}
              onChange={(e) => set(def.key, e.target.value)}
              className="mt-1"
            />
          )}
        </div>
      ))}
    </div>
  );
}
