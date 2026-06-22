'use client';

import {
  computeAutomationSchedule,
  scheduleSpanSummary,
  type EmailScheduleItem,
} from '@/lib/marketing/schedule';

type Props = {
  emails: { daysAfterPrevious: number; subject?: string }[];
  timezone?: string;
  locale?: string;
  /** When set, schedule starts from this date (e.g. automation created_at). */
  startAt?: string;
  compact?: boolean;
};

export function AutomationSchedulePreview({ emails, timezone, locale, startAt, compact }: Props) {
  const items = computeAutomationSchedule(emails, {
    start: startAt ? new Date(startAt) : new Date(),
    timezone: timezone ?? 'UTC',
    locale: locale ?? 'en',
  });

  if (!items.length) return null;

  const summary = scheduleSpanSummary(items);

  if (compact) {
    return (
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-800">Schedule:</span> {summary}
      </p>
    );
  }

  return (
    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 space-y-2">
      <p className="text-sm font-medium text-sky-900">Email schedule</p>
      <p className="text-xs text-sky-800">{summary}</p>
      <ul className="text-sm text-gray-700 space-y-1.5 mt-2">
        {items.map((item: EmailScheduleItem) => (
          <li key={item.index} className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-medium text-gray-900 shrink-0">
              Email {item.index}
              {item.index === 1 ? ' (now)' : ` (+${item.daysAfterPrevious}d)`}:
            </span>
            <span className="text-gray-600">{item.label}</span>
            {item.subject ? (
              <span className="text-gray-400 truncate w-full sm:w-auto">— {item.subject}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {timezone && (
        <p className="text-[11px] text-sky-700/80 pt-1">Times shown in {timezone}</p>
      )}
    </div>
  );
}
