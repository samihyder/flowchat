/** Campaign wizard step 2 — sequence draft helpers. */

export type ContactMessageMode = 'latest_note' | 'latest_inbound_chat' | 'latest_note_or_chat';

export type CampaignStepMergeConfig = {
  contactMessageMode?: ContactMessageMode;
};

export type CampaignStepDraft = {
  id: string;
  stepOrder: number;
  sendAt: string;
  subject: string;
  htmlBody: string;
  plainBody: string;
  mergeConfig: CampaignStepMergeConfig;
  saveAsTemplate: boolean;
  templateName: string;
  sourceTemplateId?: string | null;
};

const MIN_LEAD_MS = 60_000;

export function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function defaultSendAtForStep(index: number, previousSendAt?: string): string {
  if (index === 0) {
    const next = new Date(Date.now() + 5 * 60_000);
    next.setSeconds(0, 0);
    return next.toISOString();
  }
  const base = previousSendAt ? new Date(previousSendAt) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 3);
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= Date.now() + MIN_LEAD_MS) {
    return minutesFromNow(5);
  }
  return next.toISOString();
}

export function newCampaignStepDraft(
  index: number,
  previousSendAt?: string,
  seed?: Partial<CampaignStepDraft>
): CampaignStepDraft {
  return {
    id: crypto.randomUUID(),
    stepOrder: seed?.stepOrder ?? index + 1,
    sendAt: seed?.sendAt ?? defaultSendAtForStep(index, previousSendAt),
    subject: '',
    htmlBody: '<p>Hi {{first_name}},</p><p></p>',
    plainBody: '',
    mergeConfig: {},
    saveAsTemplate: false,
    templateName: '',
    sourceTemplateId: null,
    ...seed,
  };
}

export function addDaysAtTime(iso: string, days: number, hour: number, minute: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function containsMergeToken(text: string, token: string): boolean {
  return new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, 'i').test(text);
}

export function requiresContactMessageMode(htmlBody: string, subject: string): boolean {
  return containsMergeToken(htmlBody, 'contact_message') || containsMergeToken(subject, 'contact_message');
}

export function requiresFirstNameInBody(htmlBody: string): boolean {
  return containsMergeToken(htmlBody, 'first_name');
}

export type StepFieldError = {
  stepOrder: number;
  field: string;
  message: string;
};

export function validateCampaignStepDrafts(
  steps: Pick<
    CampaignStepDraft,
    'stepOrder' | 'sendAt' | 'subject' | 'htmlBody' | 'mergeConfig'
  >[]
): StepFieldError[] {
  const errors: StepFieldError[] = [];
  if (steps.length === 0) {
    errors.push({ stepOrder: 1, field: 'steps', message: 'Add at least one email to the sequence.' });
    return errors;
  }

  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  let previous: Date | null = null;
  const now = Date.now();

  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i]!;
    const label = step.stepOrder;

    if (!step.subject.trim()) {
      errors.push({ stepOrder: label, field: 'subject', message: 'Subject is required.' });
    }

    const bodyText = step.htmlBody.replace(/<[^>]+>/g, '').trim();
    if (!bodyText) {
      errors.push({ stepOrder: label, field: 'html_body', message: 'Email body is required.' });
    }

    if (!requiresFirstNameInBody(step.htmlBody)) {
      errors.push({
        stepOrder: label,
        field: 'html_body',
        message: 'Body must include the {{first_name}} merge tag.',
      });
    }

    if (requiresContactMessageMode(step.htmlBody, step.subject) && !step.mergeConfig.contactMessageMode) {
      errors.push({
        stepOrder: label,
        field: 'merge_config',
        message: 'Configure a message source for {{contact_message}}.',
      });
    }

    if (!step.sendAt) {
      errors.push({ stepOrder: label, field: 'send_at', message: 'Send date and time are required.' });
      continue;
    }

    const at = new Date(step.sendAt);
    if (Number.isNaN(at.getTime())) {
      errors.push({ stepOrder: label, field: 'send_at', message: 'Send date and time are invalid.' });
      continue;
    }

    if (at.getTime() <= now) {
      errors.push({
        stepOrder: label,
        field: 'send_at',
        message: 'Send time must be in the future.',
      });
    }

    if (previous && at.getTime() <= previous.getTime()) {
      errors.push({
        stepOrder: label,
        field: 'send_at',
        message: `Must be scheduled after email ${i}.`,
      });
    }
    previous = at;
  }

  return errors;
}
