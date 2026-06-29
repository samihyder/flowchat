/** Helpers for automation wizard email rows with user-chosen send times. */

export type AutomationEmailDraft = {
  id: string;
  sendAt: string;
  subject: string;
  htmlBody: string;
  templateId: string;
  saveAsTemplate: boolean;
};

const MIN_LEAD_MS = 2 * 60_000;

export function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function roundToNextHour(d = new Date()): Date {
  const next = new Date(d);
  next.setMinutes(0, 0, 0);
  if (next.getTime() <= d.getTime()) next.setHours(next.getHours() + 1);
  return next;
}

export function defaultSendAtForIndex(index: number, previousSendAt?: string): string {
  if (index === 0) return minutesFromNow(5);
  const base = previousSendAt ? new Date(previousSendAt) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 2);
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= Date.now() + MIN_LEAD_MS) {
    return minutesFromNow(5);
  }
  return next.toISOString();
}

export function newAutomationEmailDraft(
  index = 0,
  previousSendAt?: string,
  seed?: Partial<AutomationEmailDraft>
): AutomationEmailDraft {
  return {
    id: crypto.randomUUID(),
    sendAt: seed?.sendAt ?? defaultSendAtForIndex(index, previousSendAt),
    subject: '',
    htmlBody: '<p>Hi {{first_name}},</p><p></p>',
    templateId: '',
    saveAsTemplate: true,
    ...seed,
  };
}

/** Value for <input type="datetime-local" /> in a specific IANA timezone. */
export function isoToDatetimeLocalInTimezone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Parse datetime-local input as wall time in a specific IANA timezone → ISO UTC. */
export function datetimeLocalInTimezoneToIso(value: string, timeZone: string): string {
  if (!value) return '';
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return '';
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return '';
  }

  // Iteratively find UTC instant for wall time in timeZone (same approach as campaign-schedule-time)
  let t = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(t));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    let zh = get('hour');
    if (zh === 24) zh = 0;
    const diffMinutes =
      (get('year') - year) * 525600 +
      (get('month') - month) * 43200 +
      (get('day') - day) * 1440 +
      (zh - hour) * 60 +
      (get('minute') - minute);
    if (diffMinutes === 0) break;
    t -= diffMinutes * 60_000;
  }
  return new Date(t).toISOString();
}

/** Value for <input type="datetime-local" /> from an ISO string (browser local time). */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse datetime-local input to ISO string. */
export function datetimeLocalToIso(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function formatSendAtLabel(iso: string, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function ensureFutureSendAt(iso: string): string {
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now() + MIN_LEAD_MS) return iso;
  return minutesFromNow(5);
}

export function validateAutomationSchedule(emails: { sendAt: string }[]): string | null {
  let previous: Date | null = null;
  for (let i = 0; i < emails.length; i++) {
    const at = new Date(emails[i]!.sendAt);
    if (Number.isNaN(at.getTime())) return `Email ${i + 1} needs a valid send date and time`;
    if (at.getTime() <= Date.now()) return `Email ${i + 1} must be scheduled in the future`;
    if (previous && at.getTime() <= previous.getTime()) {
      return `Email ${i + 1} must be after email ${i}`;
    }
    previous = at;
  }
  return null;
}
