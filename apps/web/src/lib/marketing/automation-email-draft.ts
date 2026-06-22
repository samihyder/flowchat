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
