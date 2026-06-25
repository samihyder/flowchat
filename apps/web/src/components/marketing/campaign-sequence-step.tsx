'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CampaignRecipientDetail, type EmailTemplate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendDateTimeField } from '@/components/marketing/send-datetime-field';
import { EmailComposer } from '@/components/marketing/email-composer';
import { htmlToPlainPreview } from '@/components/marketing/email-rich-editor';
import { CampaignBulkTemplatesModal } from '@/components/marketing/campaign-bulk-templates-modal';
import { CampaignMessageSourceModal } from '@/components/marketing/campaign-message-source-modal';
import {
  type CampaignStepDraft,
  type StepFieldError,
  newCampaignStepDraft,
  requiresContactMessageMode,
  requiresFirstNameInBody,
  validateCampaignStepDrafts,
} from '@/lib/marketing/campaign-step-draft';
import { formatSendAtLabel } from '@/lib/marketing/automation-email-draft';
import { resolveScheduleTimezone } from '@/lib/timezone';

type Props = {
  accountId: string;
  token: string;
  steps: CampaignStepDraft[];
  onStepsChange: (steps: CampaignStepDraft[]) => void;
  recipients: CampaignRecipientDetail[];
  fieldErrors?: StepFieldError[];
};

function stepErrors(errors: StepFieldError[], stepOrder: number) {
  return errors.filter((e) => e.stepOrder === stepOrder);
}

function mapTemplateToStep(
  template: EmailTemplate,
  index: number,
  previousSendAt?: string
): Partial<CampaignStepDraft> {
  return {
    subject: template.subject,
    htmlBody: template.htmlBody ?? '<p></p>',
    sourceTemplateId: template.id,
    sendAt: undefined,
    stepOrder: index + 1,
  };
}

export function CampaignSequenceStep({
  accountId,
  token,
  steps,
  onStepsChange,
  recipients,
  fieldErrors = [],
}: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [messageSourceStep, setMessageSourceStep] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [timezone, setTimezone] = useState(() => resolveScheduleTimezone());
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.templates.list(accountId, token),
      api.account.get(accountId, token),
    ]).then(([t, account]) => {
      setTemplates(t.templates);
      setTimezone(resolveScheduleTimezone(account.account.timezone));
      setLocale(account.account.locale || 'en');
    });
  }, [accountId, token]);

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.stepOrder - b.stepOrder),
    [steps]
  );

  const updateStep = useCallback(
    (index: number, patch: Partial<CampaignStepDraft>) => {
      onStepsChange(
        steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
      );
    },
    [onStepsChange, steps]
  );

  const addFollowUp = () => {
    const last = sortedSteps[sortedSteps.length - 1];
    const next = newCampaignStepDraft(sortedSteps.length, last?.sendAt);
    onStepsChange([...steps, { ...next, stepOrder: sortedSteps.length + 1 }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const next = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stepOrder: i + 1 }));
    onStepsChange(next);
  };

  const applyTemplate = (index: number, templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const prev = index > 0 ? sortedSteps[index - 1]?.sendAt : undefined;
    updateStep(index, {
      ...mapTemplateToStep(tpl, index, prev),
      sendAt: steps[index]?.sendAt ?? newCampaignStepDraft(index, prev).sendAt,
    });
  };

  const handleBulkConfirm = (newSteps: CampaignStepDraft[]) => {
    const merged = [
      ...sortedSteps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
      ...newSteps.map((s, i) => ({
        ...s,
        stepOrder: sortedSteps.length + i + 1,
      })),
    ];
    onStepsChange(merged);
  };

  const previewContacts = recipients
    .filter((r) => r.recipientStatus === 'subscribed')
    .map((r) => ({ contactId: r.contactId, name: r.name }));

  const clientErrors = validateCampaignStepDrafts(sortedSteps);
  const allErrors = fieldErrors.length > 0 ? fieldErrors : clientErrors;

  const editingStep = editingIndex !== null ? steps[editingIndex] : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Email sequence</h2>
        <p className="text-sm text-gray-500">
          Schedule one or more emails. Each body must include {'{{first_name}}'}.
        </p>
      </div>

      {allErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
          <p className="font-medium">Fix these issues before continuing:</p>
          <ul className="list-disc pl-5">
            {allErrors.map((e, i) => (
              <li key={`${e.stepOrder}-${e.field}-${i}`}>
                Email {e.stepOrder}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {sortedSteps.map((step) => (
            <div
              key={step.id}
              className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-center min-w-[120px]"
            >
              <p className="text-xs font-medium text-primary-600">Email {step.stepOrder}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {step.sendAt
                  ? formatSendAtLabel(step.sendAt, locale, timezone)
                  : 'No date'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={addFollowUp}>
          + Add follow-up email
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
          Bulk add from templates
        </Button>
      </div>

      <div className="space-y-4">
        {sortedSteps.map((step) => {
          const index = steps.findIndex((s) => s.id === step.id);
          if (index < 0) return null;
          const errs = stepErrors(allErrors, step.stepOrder);
          const needsMessageSource = requiresContactMessageMode(step.htmlBody, step.subject);
          const missingFirstName = !requiresFirstNameInBody(step.htmlBody);

          return (
            <article
              key={step.id}
              className={`bg-white border rounded-xl p-5 space-y-4 ${
                errs.length > 0 ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Email {step.stepOrder}</h3>
                <button
                  type="button"
                  disabled={steps.length <= 1}
                  onClick={() => removeStep(index)}
                  className="text-xs text-red-600 hover:underline disabled:opacity-40"
                >
                  Remove step
                </button>
              </div>

              <SendDateTimeField
                value={step.sendAt}
                onChange={(iso) => updateStep(index, { sendAt: iso })}
                timezone={timezone}
                locale={locale}
              />

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Template</label>
                <select
                  className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
                  value={step.sourceTemplateId ?? ''}
                  onChange={(e) => {
                    if (e.target.value) applyTemplate(index, e.target.value);
                    else updateStep(index, { sourceTemplateId: null });
                  }}
                >
                  <option value="">Write new or pick template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                value={step.subject}
                onChange={(e) => updateStep(index, { subject: e.target.value })}
                placeholder="Subject"
              />

              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-600 min-h-[48px]">
                {step.htmlBody.replace(/<[^>]+>/g, '').trim()
                  ? htmlToPlainPreview(step.htmlBody, 120)
                  : 'Not written yet'}
              </div>

              {missingFirstName && (
                <p className="text-xs text-amber-700">
                  Add {'{{first_name}}'} in the editor — required for every email.
                </p>
              )}

              {needsMessageSource && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                  <p className="text-xs text-indigo-800">
                    {step.mergeConfig.contactMessageMode
                      ? `Message source: ${step.mergeConfig.contactMessageMode.replace(/_/g, ' ')}`
                      : '{{contact_message}} requires a source mode'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setMessageSourceStep(step.stepOrder)}
                  >
                    Configure
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="sm" onClick={() => setEditingIndex(index)}>
                  Open full-screen editor
                </Button>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={step.saveAsTemplate}
                    onChange={(e) => updateStep(index, { saveAsTemplate: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Save as template
                </label>
                {step.saveAsTemplate && (
                  <Input
                    value={step.templateName}
                    onChange={(e) => updateStep(index, { templateName: e.target.value })}
                    placeholder="Template name"
                    className="max-w-xs h-9"
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <CampaignBulkTemplatesModal
        open={bulkOpen}
        templates={templates}
        existingSteps={sortedSteps}
        timezone={timezone}
        locale={locale}
        onClose={() => setBulkOpen(false)}
        onConfirm={handleBulkConfirm}
      />

      <CampaignMessageSourceModal
        open={messageSourceStep !== null}
        stepOrder={messageSourceStep ?? 1}
        currentMode={
          sortedSteps.find((s) => s.stepOrder === messageSourceStep)?.mergeConfig
            .contactMessageMode ?? 'latest_note_or_chat'
        }
        previewContacts={previewContacts}
        onClose={() => setMessageSourceStep(null)}
        onSave={(mode) => {
          if (messageSourceStep === null) return;
          const idx = steps.findIndex((s) => s.stepOrder === messageSourceStep);
          if (idx >= 0) {
            updateStep(idx, { mergeConfig: { contactMessageMode: mode } });
          }
          setMessageSourceStep(null);
        }}
      />

      {editingStep && editingIndex !== null && (
        <EmailComposer
          title={`Edit email ${editingStep.stepOrder}`}
          initialSubject={editingStep.subject}
          initialHtmlBody={editingStep.htmlBody}
          initialTextBody={editingStep.plainBody}
          showTemplateName={false}
          showSaveAsTemplate={editingStep.saveAsTemplate}
          onClose={() => setEditingIndex(null)}
          onSave={async (data) => {
            updateStep(editingIndex, {
              subject: data.subject,
              htmlBody: data.htmlBody,
              plainBody: data.textBody,
              saveAsTemplate: data.saveAsTemplate,
              templateName: data.templateName || editingStep.templateName,
            });
            if (
              requiresContactMessageMode(data.htmlBody, data.subject) &&
              !editingStep.mergeConfig.contactMessageMode
            ) {
              setMessageSourceStep(editingStep.stepOrder);
            }
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
}
