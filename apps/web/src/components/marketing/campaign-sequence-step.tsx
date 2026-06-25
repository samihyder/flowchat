'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CampaignRecipientDetail, type EmailTemplate } from '@/lib/api';
import { SendDateTimeField } from '@/components/marketing/send-datetime-field';
import { EmailComposer } from '@/components/marketing/email-composer';
import { htmlToPlainPreview } from '@/components/marketing/email-rich-editor';
import { CampaignBulkTemplatesModal } from '@/components/marketing/campaign-bulk-templates-modal';
import { CampaignMessageSourceModal } from '@/components/marketing/campaign-message-source-modal';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
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

function mapTemplateToStep(template: EmailTemplate, index: number): Partial<CampaignStepDraft> {
  return {
    subject: template.subject,
    htmlBody: template.htmlBody ?? '<p></p>',
    sourceTemplateId: template.id,
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
      onStepsChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
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
    onStepsChange(
      steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }))
    );
  };

  const applyTemplate = (index: number, templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const prev = index > 0 ? sortedSteps[index - 1]?.sendAt : undefined;
    updateStep(index, {
      ...mapTemplateToStep(tpl, index),
      sendAt: steps[index]?.sendAt ?? newCampaignStepDraft(index, prev).sendAt,
    });
  };

  const handleBulkConfirm = (newSteps: CampaignStepDraft[]) => {
    onStepsChange([
      ...sortedSteps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
      ...newSteps.map((s, i) => ({ ...s, stepOrder: sortedSteps.length + i + 1 })),
    ]);
  };

  const previewContacts = recipients
    .filter((r) => r.recipientStatus === 'subscribed')
    .map((r) => ({ contactId: r.contactId, name: r.name }));

  const allErrors = fieldErrors.length > 0 ? fieldErrors : validateCampaignStepDrafts(sortedSteps);
  const scheduleErrors = allErrors.filter((e) => e.field === 'send_at');
  const mergeErrors = allErrors.filter(
    (e) => e.field === 'html_body' || e.field === 'merge_config'
  );
  const otherErrors = allErrors.filter(
    (e) => e.field !== 'send_at' && e.field !== 'html_body' && e.field !== 'merge_config'
  );
  const editingStep = editingIndex !== null ? steps[editingIndex] : null;

  return (
    <div className="max-w-container-max-wizard mx-auto space-y-8">
      <div>
        <h2 className="text-headline-md text-on-surface">Email sequence</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Schedule one or more emails. Each body must include {'{{first_name}}'}.
        </p>
      </div>

      {scheduleErrors.length > 0 && (
        <div className="rounded-xl border-2 border-status-danger-text/40 bg-status-danger-bg/30 px-4 py-3 text-sm text-status-danger-text">
          <p className="font-semibold flex items-center gap-2 mb-2">
            <MarketingIcon name="schedule" className="text-[20px]" />
            Schedule validation errors
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {scheduleErrors.map((e, i) => (
              <li key={`sched-${e.stepOrder}-${i}`}>
                Email {e.stepOrder}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mergeErrors.length > 0 && (
        <div className="rounded-xl border-2 border-status-danger-text bg-white px-4 py-3 text-sm shadow-sm ring-4 ring-status-danger-bg/50">
          <p className="font-semibold flex items-center gap-2 mb-2 text-status-danger-text">
            <MarketingIcon name="warning" className="text-[20px]" />
            Merge tag validation — action required
          </p>
          <ul className="space-y-2">
            {mergeErrors.map((e, i) => (
              <li
                key={`merge-${e.stepOrder}-${i}`}
                className="flex items-center gap-2 text-status-danger-text"
              >
                <MarketingIcon name="info" className="text-sm shrink-0" />
                <span>
                  Email {e.stepOrder}: {e.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold flex items-center gap-2 mb-2">
            <MarketingIcon name="error" className="text-[20px]" />
            Fix these issues before continuing
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {otherErrors.map((e, i) => (
              <li key={`${e.stepOrder}-${e.field}-${i}`}>
                Email {e.stepOrder}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline visualization */}
      <div className="flex justify-center items-center gap-2 py-2 overflow-x-auto animate-marketing-stagger-in" style={{ animationDelay: '0ms' }}>
        {sortedSteps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 shrink-0">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                i === 0
                  ? 'bg-primary text-white'
                  : 'bg-primary-container text-white border-2 border-primary'
              }`}
            >
              <MarketingIcon
                name={i === 0 ? 'forward_to_inbox' : 'mark_email_read'}
                className="text-[22px]"
              />
            </div>
            {i < sortedSteps.length - 1 ? (
              <div className="h-0.5 w-10 sm:w-16 bg-primary" />
            ) : (
              <div className="h-0.5 w-10 sm:w-16 border-t-2 border-dashed border-gray-300" />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addFollowUp}
          className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 hover:border-primary-border hover:text-primary transition-colors shrink-0"
          title="Add follow-up"
        >
          <MarketingIcon name="add" className="text-[24px]" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addFollowUp}
          className="inline-flex items-center gap-2 border border-primary-border text-primary hover:bg-primary-surface px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <MarketingIcon name="add" className="text-[18px]" />
          Add follow-up email
        </button>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          <MarketingIcon name="library_add" className="text-[18px]" />
          Bulk add from templates
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {sortedSteps.map((step, stepIdx) => {
          const index = steps.findIndex((s) => s.id === step.id);
          if (index < 0) return null;
          const errs = stepErrors(allErrors, step.stepOrder);
          const needsMessageSource = requiresContactMessageMode(step.htmlBody, step.subject);
          const missingFirstName = !requiresFirstNameInBody(step.htmlBody);
          const hasScheduleErr = errs.some((e) => e.field === 'send_at');
          const hasMergeErr = errs.some(
            (e) => e.field === 'html_body' || e.field === 'merge_config'
          );

          return (
            <section
              key={step.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:border-primary-border animate-marketing-stagger-in ${
                errs.length > 0
                  ? 'border-2 border-status-danger-text/40 ring-2 ring-status-danger-bg/30'
                  : 'border-gray-200'
              }`}
              style={{ animationDelay: `${(stepIdx + 1) * 80}ms` }}
            >
              <header className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      errs.length > 0
                        ? 'bg-status-danger-text text-white'
                        : 'bg-primary-surface text-primary'
                    }`}
                  >
                    {step.stepOrder}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-headline-sm text-on-surface">
                      {step.stepOrder === 1 ? 'Initial send' : `Follow-up ${step.stepOrder - 1}`}
                    </h3>
                    {step.sendAt && (
                      <span className="text-xs text-gray-500 font-data-mono">
                        {formatSendAtLabel(step.sendAt, locale, timezone)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {errs.length > 0 && (
                    <span className="bg-status-danger-bg text-status-danger-text px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                      {hasScheduleErr ? 'Schedule error' : hasMergeErr ? 'Merge error' : 'Error'}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={steps.length <= 1}
                    onClick={() => removeStep(index)}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    aria-label="Remove step"
                  >
                    <MarketingIcon name="delete" className="text-[20px]" />
                  </button>
                </div>
              </header>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-gray-700">Email subject</span>
                    <input
                      value={step.subject}
                      onChange={(e) => updateStep(index, { subject: e.target.value })}
                      placeholder="Enter subject line…"
                      className="w-full border border-gray-200 rounded-lg text-sm px-4 py-3 bg-gray-50 focus:ring-2 focus:ring-primary-border focus:border-primary"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-gray-700">Template</span>
                    <select
                      className="w-full border border-gray-200 rounded-lg text-sm px-4 py-3 bg-gray-50 focus:ring-2 focus:ring-primary-border"
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
                  </label>

                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-600 min-h-[52px]">
                    {step.htmlBody.replace(/<[^>]+>/g, '').trim()
                      ? htmlToPlainPreview(step.htmlBody, 100)
                      : 'Not written yet'}
                  </div>

                  {missingFirstName && (
                    <div className="flex items-center gap-2 text-status-danger-text text-xs bg-status-danger-bg/40 rounded-lg px-3 py-2">
                      <MarketingIcon name="info" className="text-[16px] shrink-0" />
                      <span>
                        Add <code className="font-data-mono font-bold">{'{{first_name}}'}</code> in
                        the editor to resolve this error.
                      </span>
                    </div>
                  )}

                  {needsMessageSource && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-primary-surface border border-primary-border px-3 py-2">
                      <p className="text-xs text-primary">
                        {step.mergeConfig.contactMessageMode
                          ? `Source: ${step.mergeConfig.contactMessageMode.replace(/_/g, ' ')}`
                          : '{{contact_message}} needs a source'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setMessageSourceStep(step.stepOrder)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Configure
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingIndex(index)}
                    className="w-full py-3 border border-primary text-primary font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-surface transition-colors text-sm"
                  >
                    <MarketingIcon name="open_in_new" className="text-[20px]" />
                    Open full-screen editor
                  </button>

                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={step.saveAsTemplate}
                      onChange={(e) => updateStep(index, { saveAsTemplate: e.target.checked })}
                      className="rounded border-gray-300 text-primary"
                    />
                    Save as template
                  </label>
                  {step.saveAsTemplate && (
                    <input
                      value={step.templateName}
                      onChange={(e) => updateStep(index, { templateName: e.target.value })}
                      placeholder="Template name"
                      className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
                    />
                  )}
                </div>

                <div
                  className={`bg-gray-50 p-4 rounded-xl border ${
                    hasScheduleErr ? 'border-status-danger-text ring-1 ring-status-danger-text/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <MarketingIcon name="calendar_today" className="text-primary" />
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Scheduling
                    </h4>
                  </div>
                  <SendDateTimeField
                    value={step.sendAt}
                    onChange={(iso) => updateStep(index, { sendAt: iso })}
                    timezone={timezone}
                    locale={locale}
                  />
                  {hasScheduleErr && (
                    <div className="mt-2 flex items-center gap-2 text-status-danger-text">
                      <MarketingIcon name="warning" className="text-sm" />
                      <span className="text-xs font-bold">
                        {errs.find((e) => e.field === 'send_at')?.message}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
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
          if (idx >= 0) updateStep(idx, { mergeConfig: { contactMessageMode: mode } });
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
