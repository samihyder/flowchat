export type EmailScheduleItem = {
  index: number;
  daysAfterPrevious: number;
  subject?: string;
  sendAt: Date;
  label: string;
};

export function computeAutomationSchedule(
  emails: { daysAfterPrevious: number; subject?: string }[],
  options?: { start?: Date; timezone?: string; locale?: string }
): EmailScheduleItem[] {
  if (!emails.length) return [];

  const start = options?.start ?? new Date();
  const timezone = options?.timezone ?? 'UTC';
  const locale = options?.locale ?? 'en';
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const dates: Date[] = [];
  let cursor = new Date(start);
  for (let i = 0; i < emails.length; i++) {
    if (i > 0) {
      const days = Math.max(0, Number(emails[i]!.daysAfterPrevious) || 0);
      cursor = new Date(cursor.getTime() + days * 24 * 60 * 60 * 1000);
    }
    dates.push(new Date(cursor));
  }

  return emails.map((email, i) => ({
    index: i + 1,
    daysAfterPrevious: i === 0 ? 0 : email.daysAfterPrevious,
    subject: email.subject,
    sendAt: dates[i]!,
    label: formatter.format(dates[i]!),
  }));
}

export function scheduleSpanSummary(items: EmailScheduleItem[]): string {
  if (!items.length) return '';
  if (items.length === 1) return `First email: ${items[0]!.label}`;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const spanDays = Math.round((last.sendAt.getTime() - first.sendAt.getTime()) / (24 * 60 * 60 * 1000));
  const span =
    spanDays === 0
      ? 'same day'
      : spanDays === 1
        ? '1 day'
        : `${spanDays} days`;
  return `${first.label} → ${last.label} (${span} between first and last)`;
}

/** Parse workflow steps from automation stats into schedule inputs. */
export function emailsFromWorkflowSteps(
  steps: { stepType: string; config: Record<string, unknown> }[]
): { daysAfterPrevious: number; subject?: string }[] {
  let pendingDays = 0;
  const emails: { daysAfterPrevious: number; subject?: string }[] = [];
  for (const step of steps) {
    if (step.stepType === 'wait') {
      pendingDays = Math.round(Number(step.config.hours ?? 0) / 24) || 0;
    } else if (step.stepType === 'send_email') {
      emails.push({
        daysAfterPrevious: emails.length === 0 ? 0 : pendingDays,
        subject: String(step.config.subject ?? ''),
      });
      pendingDays = 0;
    }
  }
  return emails;
}
