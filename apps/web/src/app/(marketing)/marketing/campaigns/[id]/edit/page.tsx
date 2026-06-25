'use client';

import type { Route } from 'next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  api,
  type CampaignRecipientDetail,
  type CampaignSenderConfig,
  type CampaignStep,
  type MarketingCampaign,
} from '@/lib/api';
import { CampaignRecipientsStep } from '@/components/marketing/campaign-recipients-step';
import { CampaignSequenceStep } from '@/components/marketing/campaign-sequence-step';
import {
  CampaignSenderStep,
  type CampaignSenderStepHandle,
} from '@/components/marketing/campaign-sender-step';
import { CampaignReviewStep } from '@/components/marketing/campaign-review-step';
import { CampaignWizardChrome } from '@/components/marketing/ui/campaign-wizard-chrome';
import {
  type CampaignStepDraft,
  type StepFieldError,
  newCampaignStepDraft,
  validateCampaignStepDrafts,
} from '@/lib/marketing/campaign-step-draft';

function apiStepToDraft(step: CampaignStep): CampaignStepDraft {
  return {
    id: step.id,
    stepOrder: step.stepOrder,
    sendAt: step.sendAt ?? newCampaignStepDraft(step.stepOrder - 1).sendAt,
    subject: step.subject,
    htmlBody: step.htmlBody,
    plainBody: step.plainBody ?? '',
    mergeConfig: {
      contactMessageMode: step.mergeConfig.contactMessageMode ?? undefined,
    },
    saveAsTemplate: step.saveAsTemplate,
    templateName: step.templateName ?? '',
    sourceTemplateId: step.sourceTemplateId,
  };
}

export default function CampaignWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { token, accountId } = useAuthStore();
  const senderStepRef = useRef<CampaignSenderStepHandle>(null);

  const stepParam = Number(searchParams.get('step') ?? '1');
  const activeStep = Number.isFinite(stepParam) ? Math.min(4, Math.max(1, stepParam)) : 1;

  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recipientSummary, setRecipientSummary] = useState({ selected: 0, suppressed: 0 });
  const [lastPutRecipients, setLastPutRecipients] = useState<CampaignRecipientDetail[] | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<CampaignStepDraft[]>([
    newCampaignStepDraft(0),
  ]);
  const [savedSteps, setSavedSteps] = useState<CampaignStep[]>([]);
  const [stepFieldErrors, setStepFieldErrors] = useState<StepFieldError[]>([]);
  const [senderConfig, setSenderConfig] = useState<CampaignSenderConfig | null>(null);

  const load = useCallback(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.campaigns.get(accountId, campaignId, token),
      api.marketing.campaigns.getRecipients(accountId, campaignId, token).catch(() => null),
      api.marketing.campaigns.getSteps(accountId, campaignId, token).catch(() => null),
      api.marketing.campaigns.getSender(accountId, campaignId, token).catch(() => null),
      api.contacts.access(accountId, token),
    ])
      .then(([campaignRes, recipientsRes, stepsRes, senderRes, accessRes]) => {
        setCampaign(campaignRes.campaign);
        setName(campaignRes.campaign.name);
        setIsAdmin(accessRes.isAdmin);
        if (recipientsRes) {
          setSelectedIds(new Set(recipientsRes.contactIds));
          setLastPutRecipients(recipientsRes.recipients);
          setRecipientSummary(recipientsRes.summary);
        }
        if (stepsRes?.steps?.length) {
          setSequenceSteps(stepsRes.steps.map(apiStepToDraft));
          setSavedSteps(stepsRes.steps);
        }
        if (senderRes) {
          setSenderConfig(senderRes.sender);
        }
      })
      .catch(() => router.push('/marketing/campaigns' as Route))
      .finally(() => setLoading(false));
  }, [accountId, campaignId, router, token]);

  useEffect(load, [load]);

  const saveRecipients = async (): Promise<boolean> => {
    if (!token || !accountId) return false;
    if (selectedIds.size === 0) {
      setError('Select at least one recipient with a valid email address.');
      return false;
    }
    try {
      const res = await api.marketing.campaigns.putRecipients(
        accountId,
        campaignId,
        [...selectedIds],
        token
      );
      setLastPutRecipients(res.recipients);
      setRecipientSummary({ selected: res.selected, suppressed: res.excluded.suppressed });
      setError('');
      return res.selected > 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipients');
      return false;
    }
  };

  const saveSequence = async (): Promise<boolean> => {
    if (!token || !accountId) return false;
    const clientErrors = validateCampaignStepDrafts(sequenceSteps);
    if (clientErrors.length > 0) {
      setStepFieldErrors(clientErrors);
      setError('Fix sequence validation errors before continuing.');
      return false;
    }
    try {
      const res = await api.marketing.campaigns.putSteps(
        accountId,
        campaignId,
        sequenceSteps.map((s) => ({
          stepOrder: s.stepOrder,
          sendAt: s.sendAt,
          subject: s.subject,
          htmlBody: s.htmlBody,
          plainBody: s.plainBody,
          mergeConfig: s.mergeConfig,
          saveAsTemplate: s.saveAsTemplate,
          templateName: s.templateName,
          sourceTemplateId: s.sourceTemplateId,
        })),
        token
      );
      setSequenceSteps(res.steps.map(apiStepToDraft));
      setSavedSteps(res.steps);
      setStepFieldErrors([]);
      setError('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sequence');
      return false;
    }
  };

  const saveSender = async (): Promise<boolean> => {
    if (!senderStepRef.current) return false;
    const ok = await senderStepRef.current.save();
    if (!ok) {
      setError('Failed to save sender settings.');
      return false;
    }
    const senderRes = await api.marketing.campaigns.getSender(accountId!, campaignId, token!);
    setSenderConfig(senderRes.sender);
    setError('');
    return true;
  };

  const goToStep = async (step: number) => {
    if (!token || !accountId || !campaign) return;
    setSaving(true);
    setError('');
    try {
      if (activeStep === 1 && step > 1) {
        const ok = await saveRecipients();
        if (!ok) return;
      }
      if (activeStep === 2 && step > 2) {
        const ok = await saveSequence();
        if (!ok) return;
      }
      if (activeStep === 2 && step < 2) {
        await saveSequence();
      }
      if (activeStep === 3 && step > 3) {
        const ok = await saveSender();
        if (!ok) return;
      }
      if (activeStep === 3 && step !== 3) {
        await saveSender();
      }

      const res = await api.marketing.campaigns.patch(
        accountId,
        campaignId,
        { name, currentStep: step },
        token
      );
      setCampaign(res.campaign);
      router.push(
        `/marketing/campaigns/${campaignId}/edit?step=${step}` as Route
      );
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!token || !accountId || !campaign) return;
    setSaving(true);
    setError('');
    try {
      if (activeStep === 1 && selectedIds.size > 0) {
        await saveRecipients();
      }
      if (activeStep === 2) {
        await saveSequence();
      }
      if (activeStep === 3) {
        await saveSender();
      }
      const res = await api.marketing.campaigns.patch(
        accountId,
        campaignId,
        { name, currentStep: activeStep },
        token
      );
      setCampaign(res.campaign);
    } finally {
      setSaving(false);
    }
  };

  const patchName = () => {
    if (name !== campaign?.name && token && accountId) {
      void api.marketing.campaigns.patch(accountId, campaignId, { name }, token);
    }
  };

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        Loading campaign…
      </div>
    );
  }

  if (campaign.status !== 'draft') {
    router.replace(`/marketing/campaigns/${campaignId}` as Route);
    return null;
  }

  const footerSummary =
    activeStep === 1 ? (
      <div className="flex items-center gap-2">
        <span className="font-bold text-on-surface">{selectedIds.size}</span>
        <span className="text-on-surface-variant">recipients selected</span>
      </div>
    ) : activeStep === 2 && sequenceSteps.length > 0 ? (
      <div className="flex items-center gap-2">
        <span className="font-bold text-on-surface">{sequenceSteps.length}</span>
        <span className="text-on-surface-variant">
          email{sequenceSteps.length === 1 ? '' : 's'} in sequence
        </span>
      </div>
    ) : activeStep === 3 && senderConfig?.fromEmail ? (
      <span className="text-on-surface-variant text-sm">
        Sending as {senderConfig.fromName} &lt;{senderConfig.fromEmail}&gt;
      </span>
    ) : null;

  const canProceedStep1 = selectedIds.size > 0;
  const nextDisabled = saving || (activeStep === 1 && !canProceedStep1);

  return (
    <CampaignWizardChrome
      name={name}
      onNameChange={setName}
      onNameBlur={patchName}
      campaignId={campaignId}
      status={campaign.status}
      activeStep={activeStep}
      onStepClick={(step) => void goToStep(step)}
      error={error}
      suppressedWarning={activeStep === 1 && recipientSummary.suppressed > 0}
      onLaunch={activeStep === 4 ? () => void goToStep(4) : undefined}
      footerLeft={footerSummary}
      footerRight={
        <>
          {activeStep > 1 ? (
            <button
              type="button"
              className="px-6 py-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors disabled:opacity-50"
              disabled={saving}
              onClick={() => void goToStep(activeStep - 1)}
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            className="px-6 py-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors disabled:opacity-50"
            disabled={saving}
            onClick={() => void saveDraft()}
          >
            Save draft
          </button>
          {activeStep < 4 ? (
            <button
              type="button"
              className={`px-8 py-2 rounded-lg font-bold transition-all ${
                nextDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:bg-primary-hover'
              }`}
              disabled={nextDisabled}
              onClick={() => void goToStep(activeStep + 1)}
            >
              Next
            </button>
          ) : null}
        </>
      }
    >
      {activeStep === 1 && token && accountId && (
        <CampaignRecipientsStep
          accountId={accountId}
          campaignId={campaignId}
          token={token}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onSummaryChange={setRecipientSummary}
          onImportComplete={setLastPutRecipients}
          lastPutResult={lastPutRecipients}
        />
      )}
      {activeStep === 2 && token && accountId && (
        <CampaignSequenceStep
          accountId={accountId}
          token={token}
          steps={sequenceSteps}
          onStepsChange={setSequenceSteps}
          recipients={lastPutRecipients ?? []}
          fieldErrors={stepFieldErrors}
        />
      )}
      {activeStep === 3 && token && accountId && (
        <CampaignSenderStep ref={senderStepRef} accountId={accountId} campaignId={campaignId} token={token} />
      )}
      {activeStep === 4 && token && accountId && (
        <CampaignReviewStep
          accountId={accountId}
          campaignId={campaignId}
          token={token}
          campaign={campaign}
          steps={savedSteps}
          recipients={lastPutRecipients ?? []}
          recipientSummary={recipientSummary}
          sender={senderConfig}
          isAdmin={isAdmin}
          onLaunched={() => {
            router.push(`/marketing/campaigns/${campaignId}` as Route);
          }}
        />
      )}
    </CampaignWizardChrome>
  );
}
