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
  type PreflightResult,
} from '@/lib/api';
import { CampaignRecipientsStep } from '@/components/marketing/campaign-recipients-step';
import { CampaignSequenceStep } from '@/components/marketing/campaign-sequence-step';
import {
  CampaignSenderStep,
  type CampaignSenderStepHandle,
} from '@/components/marketing/campaign-sender-step';
import {
  CampaignReviewStep,
  type CampaignReviewStepHandle,
} from '@/components/marketing/campaign-review-step';
import { CampaignWizardChrome } from '@/components/marketing/ui/campaign-wizard-chrome';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';
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
  const reviewStepRef = useRef<CampaignReviewStepHandle>(null);

  const stepParam = Number(searchParams.get('step') ?? '1');
  const urlStep = Number.isFinite(stepParam) ? Math.min(4, Math.max(1, stepParam)) : 1;
  const [displayStep, setDisplayStep] = useState<number | null>(null);
  const activeStep = displayStep ?? urlStep;

  useEffect(() => {
    setDisplayStep(null);
  }, [urlStep]);

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
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosave = useRef(true);

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
      setError(marketingErrorMessage(err, 'Failed to save recipients'));
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
      setError(marketingErrorMessage(err, 'Failed to save sequence'));
      return false;
    }
  };

  const saveSender = async (): Promise<boolean> => {
    if (!senderStepRef.current) {
      setError('Sender settings are still loading. Please wait a moment.');
      return false;
    }
    const saveError = await senderStepRef.current.save();
    if (saveError) {
      setError(saveError);
      return false;
    }
    try {
      const senderRes = await api.marketing.campaigns.getSender(accountId!, campaignId, token!);
      setSenderConfig(senderRes.sender);
      setError('');
      return true;
    } catch (err) {
      setError(marketingErrorMessage(err, 'Failed to load sender settings.'));
      return false;
    }
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
      if (activeStep === 3 && step !== 3) {
        const ok = await saveSender();
        if (!ok) return;
      }

      const res = await api.marketing.campaigns.patch(
        accountId,
        campaignId,
        { name, currentStep: step },
        token
      );
      setCampaign(res.campaign);

      if (step === 4) {
        const [stepsRes, senderRes, recipientsRes] = await Promise.all([
          api.marketing.campaigns.getSteps(accountId, campaignId, token),
          api.marketing.campaigns.getSender(accountId, campaignId, token),
          api.marketing.campaigns.getRecipients(accountId, campaignId, token),
        ]);
        setSavedSteps(stepsRes.steps);
        setSequenceSteps(stepsRes.steps.map(apiStepToDraft));
        setSenderConfig(senderRes.sender);
        setLastPutRecipients(recipientsRes.recipients);
        setRecipientSummary(recipientsRes.summary);
      }

      setDisplayStep(step);
      router.replace(`/marketing/campaigns/${campaignId}/edit?step=${step}` as Route);
    } catch (err) {
      setError(marketingErrorMessage(err, 'Could not save this step. Please try again.'));
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

  const patchName = useCallback(() => {
    if (name !== campaign?.name && token && accountId) {
      void api.marketing.campaigns.patch(accountId, campaignId, { name }, token);
    }
  }, [accountId, campaign?.name, campaignId, name, token]);

  const runAutosave = useCallback(async () => {
    if (!token || !accountId || !campaign || campaign.status !== 'draft') return;
    setAutosaveStatus('saving');
    try {
      if (activeStep === 1 && selectedIds.size > 0) {
        await api.marketing.campaigns.putRecipients(
          accountId,
          campaignId,
          [...selectedIds],
          token
        );
      } else if (activeStep === 2) {
        try {
          await api.marketing.campaigns.putSteps(
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
        } catch {
          /* draft autosave — sequence may be incomplete */
        }
      } else if (activeStep === 3 && senderStepRef.current) {
        const saveErr = await senderStepRef.current.save();
        if (saveErr) throw new Error(saveErr);
      }
      await api.marketing.campaigns.patch(
        accountId,
        campaignId,
        { name, currentStep: activeStep },
        token
      );
      setAutosaveStatus('saved');
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      savedFadeTimer.current = setTimeout(() => setAutosaveStatus('idle'), 3000);
    } catch {
      setAutosaveStatus('idle');
    }
  }, [accountId, activeStep, campaign, campaignId, name, selectedIds, sequenceSteps, token]);

  useEffect(() => {
    if (loading || !campaign || campaign.status !== 'draft') return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void runAutosave();
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [name, sequenceSteps, selectedIds, activeStep, loading, campaign, runAutosave]);

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

  const canProceedStep1 = selectedIds.size > 0;
  const canProceedStep3 = Boolean(senderConfig?.fromEmail?.trim());
  const nextDisabled =
    saving ||
    (activeStep === 1 && !canProceedStep1) ||
    (activeStep === 3 && !canProceedStep3);
  const launchReady = Boolean(preflight?.ready && isAdmin);

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
    ) : activeStep === 4 ? (
      <div className="hidden sm:block">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">
          Ready to deploy
        </p>
        <p
          className={`text-xs font-medium mt-1 ${
            launchReady ? 'text-status-success-text' : 'text-on-surface-variant'
          }`}
        >
          {launchReady ? 'All checks passed' : 'Complete pre-flight checks'}
        </p>
      </div>
    ) : null;

  const handleLaunched = () => {
    router.push(`/marketing/campaigns/${campaignId}?launched=1` as Route);
  };

  return (
    <CampaignWizardChrome
      name={name}
      onNameChange={setName}
      onNameBlur={patchName}
      campaignId={campaignId}
      status={campaign.status}
      activeStep={activeStep}
      autosaveStatus={autosaveStatus}
      onStepClick={(step) => void goToStep(step)}
      error={error}
      suppressedWarning={activeStep === 1 && recipientSummary.suppressed > 0}
      onLaunch={activeStep === 4 && isAdmin ? () => reviewStepRef.current?.openLaunch() : undefined}
      launchDisabled={!launchReady}
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
              className={`px-8 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                nextDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:bg-primary-hover'
              }`}
              disabled={nextDisabled}
              onClick={() => void goToStep(activeStep + 1)}
            >
              {activeStep === 3 ? (
                <>
                  Next: Review &amp; Launch
                  <MarketingIcon name="arrow_forward" className="text-lg" />
                </>
              ) : (
                'Next'
              )}
            </button>
          ) : isAdmin ? (
            <button
              type="button"
              className="flex items-center gap-3 bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!launchReady}
              onClick={() => reviewStepRef.current?.openLaunch()}
            >
              Launch Campaign
              <MarketingIcon name="rocket_launch" />
            </button>
          ) : (
            <p className="text-sm text-on-surface-variant italic px-2">
              An administrator will launch this campaign when ready.
            </p>
          )}
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
        <CampaignSenderStep
          ref={senderStepRef}
          accountId={accountId}
          campaignId={campaignId}
          token={token}
          onConfigChange={(partial) =>
            setSenderConfig((prev) => ({
              fromName: partial.fromName ?? prev?.fromName ?? null,
              fromEmail: partial.fromEmail ?? prev?.fromEmail ?? null,
              replyTo: partial.replyTo ?? prev?.replyTo ?? null,
              signatureHtml: partial.signatureHtml ?? prev?.signatureHtml ?? null,
              useWorkspaceSignature:
                partial.useWorkspaceSignature ?? prev?.useWorkspaceSignature ?? true,
              meetingLink: partial.meetingLink ?? prev?.meetingLink ?? null,
              portfolioLink: partial.portfolioLink ?? prev?.portfolioLink ?? null,
              credentialId: prev?.credentialId ?? null,
              testSentAt: prev?.testSentAt ?? null,
              testSentBy: prev?.testSentBy ?? null,
              testSentTo: prev?.testSentTo ?? null,
            }))
          }
        />
      )}
      {activeStep === 4 && token && accountId && (
        <CampaignReviewStep
          ref={reviewStepRef}
          accountId={accountId}
          campaignId={campaignId}
          token={token}
          campaign={campaign}
          steps={savedSteps}
          recipients={lastPutRecipients ?? []}
          recipientSummary={recipientSummary}
          sender={senderConfig}
          isAdmin={isAdmin}
          onPreflightChange={setPreflight}
          onLaunched={handleLaunched}
        />
      )}
    </CampaignWizardChrome>
  );
}
