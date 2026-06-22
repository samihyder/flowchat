'use client';

import { Input } from '@/components/ui/input';
import {
  datetimeLocalToIso,
  formatSendAtLabel,
  isoToDatetimeLocal,
  minutesFromNow,
} from '@/lib/marketing/automation-email-draft';

type Props = {
  value: string;
  onChange: (iso: string) => void;
  timezone: string;
  locale: string;
};

const QUICK_OPTIONS = [
  { label: 'In 2 min', minutes: 2 },
  { label: 'In 5 min', minutes: 5 },
  { label: 'In 15 min', minutes: 15 },
  { label: 'In 1 hour', minutes: 60 },
] as const;

export function SendDateTimeField({ value, onChange, timezone, locale }: Props) {
  const minLocal = isoToDatetimeLocal(new Date(Date.now() + 60_000).toISOString());

  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">Send date & time *</label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="datetime-local"
          value={isoToDatetimeLocal(value)}
          min={minLocal}
          onChange={(e) => {
            const iso = datetimeLocalToIso(e.target.value);
            if (iso) onChange(iso);
          }}
          className="max-w-xs"
          required
        />
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.minutes}
            type="button"
            onClick={() => onChange(minutesFromNow(opt.minutes))}
            className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 mt-1">
        {formatSendAtLabel(value, locale, timezone)} ({timezone})
      </p>
    </div>
  );
}
