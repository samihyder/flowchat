import { resolveContactTimezone } from '@/lib/marketing/send-time';

export type ScheduleMode = 'campaign' | 'recipient_local';

export function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/** UTC instant for a wall-clock time in a given IANA timezone. */
export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let t = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const p = getZonedParts(new Date(t), timeZone);
    const diffMinutes =
      (p.year - year) * 525600 +
      (p.month - month) * 43200 +
      (p.day - day) * 1440 +
      (p.hour - hour) * 60 +
      (p.minute - minute);
    if (diffMinutes === 0) break;
    t -= diffMinutes * 60_000;
  }
  return new Date(t);
}

export function resolveRecipientScheduledAt(
  stepSendAtIso: string,
  campaignTimezone: string,
  recipientTimezone: string | null | undefined,
  mode: ScheduleMode
): string {
  const instant = new Date(stepSendAtIso);
  if (Number.isNaN(instant.getTime())) return stepSendAtIso;
  if (mode === 'campaign') return instant.toISOString();

  const recipientTz = resolveContactTimezone(recipientTimezone, campaignTimezone);
  if (recipientTz === campaignTimezone) return instant.toISOString();

  const parts = getZonedParts(instant, campaignTimezone);
  return wallTimeToUtc(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    recipientTz
  ).toISOString();
}

export function scheduleModeLabel(mode: ScheduleMode): string {
  return mode === 'recipient_local'
    ? 'Each recipient\'s local time'
    : 'Same moment for everyone';
}
