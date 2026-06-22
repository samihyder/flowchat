export type EmailScheduleItem = {
  index: number;
  subject?: string;
  sendAt: Date;
  label: string;
};

export function computeAutomationSchedule(
  emails: { sendAt: string; subject?: string }[],
  options?: { timezone?: string; locale?: string }
): EmailScheduleItem[] {
  if (!emails.length) return [];

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

  return emails.flatMap((email, i) => {
    const sendAt = new Date(email.sendAt);
    if (Number.isNaN(sendAt.getTime())) return [];
    return [
      {
        index: i + 1,
        subject: email.subject,
        sendAt,
        label: formatter.format(sendAt),
      },
    ];
  });
}

export function scheduleSpanSummary(items: EmailScheduleItem[]): string {
  if (!items.length) return '';
  if (items.length === 1) return `Sends ${items[0]!.label}`;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const spanDays = Math.round((last.sendAt.getTime() - first.sendAt.getTime()) / (24 * 60 * 60 * 1000));
  const span =
    spanDays === 0 ? 'same day' : spanDays === 1 ? '1 day' : `${spanDays} days`;
  return `${first.label} → ${last.label} (${span} span)`;
}

/** Parse workflow steps into user-scheduled send times. */
export function emailsFromWorkflowSteps(
  steps: { stepType: string; config: Record<string, unknown> }[]
): { sendAt: string; subject?: string }[] {
  const emails: { sendAt: string; subject?: string }[] = [];
  let pendingUntil: string | undefined;

  for (const step of steps) {
    if (step.stepType === 'wait') {
      const until = step.config.until;
      if (typeof until === 'string' && until) pendingUntil = until;
    } else if (step.stepType === 'send_email') {
      const config = step.config;
      const sendAt =
        (typeof config.sendAt === 'string' && config.sendAt) ||
        pendingUntil ||
        new Date().toISOString();
      emails.push({
        sendAt,
        subject: String(config.subject ?? ''),
      });
      pendingUntil = undefined;
    }
  }

  return emails;
}

/** @deprecated Legacy day-offset schedules — kept for old rows without sendAt. */
export function legacyEmailsFromWorkflowSteps(
  steps: { stepType: string; config: Record<string, unknown> }[],
  startAt?: string
): { daysAfterPrevious: number; subject?: string }[] {
  let pendingDays = 0;
  const emails: { daysAfterPrevious: number; subject?: string }[] = [];
  for (const step of steps) {
    if (step.stepType === 'wait' && !step.config.until) {
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
