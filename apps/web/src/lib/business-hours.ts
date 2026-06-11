export type DaySchedule = { open: string; close: string; enabled: boolean };

export type BusinessHours = Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  DaySchedule
>;

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { open: '09:00', close: '17:00', enabled: true },
  tue: { open: '09:00', close: '17:00', enabled: true },
  wed: { open: '09:00', close: '17:00', enabled: true },
  thu: { open: '09:00', close: '17:00', enabled: true },
  fri: { open: '09:00', close: '17:00', enabled: true },
  sat: { open: '09:00', close: '17:00', enabled: false },
  sun: { open: '09:00', close: '17:00', enabled: false },
};

const DAY_KEYS: (keyof BusinessHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function parseBusinessHours(raw: unknown, timezone = 'UTC'): BusinessHours {
  if (!raw || typeof raw !== 'object') return DEFAULT_BUSINESS_HOURS;
  return { ...DEFAULT_BUSINESS_HOURS, ...(raw as BusinessHours) };
}

/** Returns whether agents should appear online for the widget right now. */
export function isWithinBusinessHours(hours: BusinessHours, timezone: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase().slice(0, 3);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const now = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    const keyMap: Record<string, keyof BusinessHours> = {
      sun: 'sun',
      mon: 'mon',
      tue: 'tue',
      wed: 'wed',
      thu: 'thu',
      fri: 'fri',
      sat: 'sat',
    };
    const dayKey = keyMap[weekday ?? 'mon'] ?? 'mon';
    const schedule = hours[dayKey];
    if (!schedule?.enabled) return false;
    return now >= schedule.open && now < schedule.close;
  } catch {
    return true;
  }
}
