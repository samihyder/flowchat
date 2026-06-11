'use client';

import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
  type DaySchedule,
} from '@/lib/business-hours';
import { checkboxClass, fieldClass } from '@/components/ui/form-field';

const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

type Props = {
  enabled: boolean;
  hours: BusinessHours;
  onEnabledChange: (enabled: boolean) => void;
  onChange: (hours: BusinessHours) => void;
};

export function BusinessHoursEditor({ enabled, hours, onEnabledChange, onChange }: Props) {
  const value = { ...DEFAULT_BUSINESS_HOURS, ...hours };

  const updateDay = (key: keyof BusinessHours, patch: Partial<DaySchedule>) => {
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Enforce business hours for widget availability
      </label>
      {enabled && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Day</th>
                <th className="text-left px-3 py-2 font-medium">Open</th>
                <th className="text-left px-3 py-2 font-medium">Close</th>
                <th className="text-left px-3 py-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DAYS.map(({ key, label }) => (
                <tr key={key}>
                  <td className="px-3 py-2 font-medium text-gray-700">{label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      value={value[key].open}
                      disabled={!value[key].enabled}
                      onChange={(e) => updateDay(key, { open: e.target.value })}
                      className={`${fieldClass} w-auto py-1 px-2 text-xs`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      value={value[key].close}
                      disabled={!value[key].enabled}
                      onChange={(e) => updateDay(key, { close: e.target.value })}
                      className={`${fieldClass} w-auto py-1 px-2 text-xs`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={value[key].enabled}
                      onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 px-3 py-2 bg-gray-50">
            Uses your workspace timezone from Account settings.
          </p>
        </div>
      )}
    </div>
  );
}
