/** Browser / IANA timezone helpers for marketing schedules. */

export const MARKETING_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export function getBrowserTimezone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function marketingTimezoneOptions(preferred?: string | null): string[] {
  const browser = getBrowserTimezone();
  const extras = [preferred, browser].filter(
    (tz): tz is string => Boolean(tz?.trim()) && tz !== 'UTC'
  );
  const merged: string[] = [...MARKETING_TIMEZONES];
  for (const tz of extras) {
    if (!merged.includes(tz)) merged.unshift(tz);
  }
  return merged;
}

/** Default schedule TZ: account setting, then browser, then UTC. */
export function resolveScheduleTimezone(accountTimezone?: string | null): string {
  if (accountTimezone?.trim() && accountTimezone !== 'UTC') {
    return accountTimezone.trim();
  }
  return getBrowserTimezone();
}

export function formatInTimezone(
  iso: string | Date,
  timezone: string,
  locale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date);
}

export function timezoneShortLabel(timezone: string): string {
  return timezone.replace(/_/g, ' ');
}
