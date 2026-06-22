'use client';

import { useEffect, useState } from 'react';
import { LABEL_COLOR_PRESETS, normalizeLabelColor } from '@/lib/labels/colors';

type Props = {
  value: string;
  onChange: (color: string) => void;
  id?: string;
};

export function LabelColorPicker({ value, onChange, id }: Props) {
  const normalized = normalizeLabelColor(value);
  const [hexInput, setHexInput] = useState(normalized);

  useEffect(() => {
    setHexInput(normalized);
  }, [normalized]);

  const applyHex = (raw: string) => {
    setHexInput(raw);
    const next = normalizeLabelColor(raw, '');
    if (next) onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {LABEL_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-105 ${
              normalized === c ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
            title={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={normalized}
          onChange={(e) => onChange(normalizeLabelColor(e.target.value))}
          className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
          aria-label="Custom color"
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => applyHex(e.target.value)}
          onBlur={() => setHexInput(normalizeLabelColor(hexInput))}
          placeholder="#6366F1"
          className="w-28 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg"
          maxLength={7}
          spellCheck={false}
        />
        <span
          className="inline-block w-6 h-6 rounded-full border border-gray-200 shrink-0"
          style={{ backgroundColor: normalized }}
          aria-hidden
        />
      </div>
    </div>
  );
}
