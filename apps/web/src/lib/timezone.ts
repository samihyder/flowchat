/** Browser / IANA timezone for schedule UI (datetime-local is always local). */
export function getBrowserTimezone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Schedule pickers use the browser clock; labels should match, not account UTC. */
export function resolveScheduleTimezone(_accountTimezone?: string | null): string {
  return getBrowserTimezone();
}
