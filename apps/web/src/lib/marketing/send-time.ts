export function isInSendWindow(
  timezone: string,
  startHour: number,
  endHour: number,
  now = new Date()
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      hour12: false,
    });
    const hour = Number(formatter.format(now));
    if (startHour <= endHour) {
      return hour >= startHour && hour < endHour;
    }
    return hour >= startHour || hour < endHour;
  } catch {
    return true;
  }
}

export function resolveContactTimezone(contactTz: string | null | undefined, accountTz: string): string {
  return contactTz?.trim() || accountTz?.trim() || 'UTC';
}
