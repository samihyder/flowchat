'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type CampaignRecipientDetail, type CampaignStep, type MarketingCampaign } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CampaignRecipientsStep } from '@/components/marketing/campaign-recipients-step';
import { CampaignSequenceStep } from '@/components/marketing/campaign-sequence-step';
import {
  type CampaignStepDraft,
  type StepFieldError,
  newCampaignStepDraft,
  validateCampaignStepDrafts,
} from '@/lib/marketing/campaign-step-draft';

const STEPS = [
  { n: 1, label: 'Recipients' },
  { n: 2, label: 'Sequence' },
  { n: 3, label: 'Sender' },
  { n: 4, label: 'Review' },
] as const;

function formatCampaignId(id: string) {
  return `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

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

  const stepParam = Number(searchParams.get('step') ?? '1');
  const activeStep = Number.isFinite(stepParam) ? Math.min(4, Math.max(1, stepParam)) : 1;

  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recipientSummary, setRecipientSummary] = useState({ selected: 0, suppressed: 0 });
  const [lastPutRecipients, setLastPutRecipients] = useState<CampaignRecipientDetail[] | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<CampaignStepDraft[]>([
    newCampaignStepDraft(0),
  ]);
  const [stepFieldErrors, setStepFieldErrors] = useState<StepFieldError[]>([]);

  const load = useCallback(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.campaigns.get(accountId, campaignId, token),
      api.marketing.campaigns.getRecipients(accountId, campaignId, token).catch(() => null),
      api.marketing.campaigns.getSteps(accountId, campaignId, token).catch(() => null),
    ])
      .then(([campaignRes, recipientsRes, stepsRes]) => {
        setCampaign(campaignRes.campaign);
        setName(campaignRes.campaign.name);
        if (recipientsRes) {
          setSelectedIds(new Set(recipientsRes.contactIds));
          setLastPutRecipients(recipientsRes.recipients);
          setRecipientSummary(recipientsRes.summary);
        }
        if (stepsRes?.steps?.length) {
          setSequenceSteps(stepsRes.steps.map(apiStepToDraft));
        }
      })
      .catch(() => router.push('/dashboard/marketing/campaigns' as Route))
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
      setStepFieldErrors([]);
      setError('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sequence');
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

      const res = await api.marketing.campaigns.patch(
        accountId,
        campaignId,
        { name, currentStep: step },
        token
      );
      setCampaign(res.campaign);
      router.push(
        `/dashboard/marketing/campaigns/${campaignId}/edit?step=${step}` as Route
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

  const copyCampaignId = async () => {
    try {
      await navigator.clipboard.writeText(campaignId);
    } catch {
      /* ignore */
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
    router.replace(`/dashboard/marketing/campaigns/${campaignId}` as Route);
    return null;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="border-b border-gray-200 bg-white px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name !== campaign.name && token && accountId) {
                  void api.marketing.campaigns.patch(accountId, campaignId, { name }, token);
                }
              }}
              className="font-semibold text-lg max-w-md border-0 shadow-none px-0 focus-visible:ring-0"
            />
            <Badge color="gray">Draft</Badge>
            <button
              type="button"
              onClick={copyCampaignId}
              className="text-xs font-mono text-gray-400 hover:text-primary-600 shrink-0"
              title="Copy campaign ID"
            >
              {formatCampaignId(campaignId)}
            </button>
          </div>
          <Link
            href={'/dashboard/marketing/campaigns' as Route}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Back to list
          </Link>
        </div>

        <nav className="flex gap-0 border-b border-gray-100 -mb-px">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => void goToStep(s.n)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeStep === s.n
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                  activeStep === s.n
                    ? 'bg-primary-500 text-white'
                    : activeStep > s.n
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {s.n}
              </span>
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

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
        {activeStep === 3 && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sender &amp; signature</h2>
            <p className="text-sm text-gray-500">Sender configuration — Sprint 6M-5.</p>
          </div>
        )}
        {activeStep === 4 && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Review &amp; launch</h2>
            <p className="text-sm text-gray-500">Pre-flight and launch — Sprint 6M-5.</p>
          </div>
        )}
      </div>

      <footer className="border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="text-sm text-gray-500">
          {activeStep === 1 && selectedIds.size > 0 && (
            <span>
              {recipientSummary.selected} recipient{recipientSummary.selected === 1 ? '' : 's'} ready
            </span>
          )}
          {activeStep === 2 && sequenceSteps.length > 0 && (
            <span>
              {sequenceSteps.length} email{sequenceSteps.length === 1 ? '' : 's'} in sequence
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={activeStep <= 1 || saving}
            onClick={() => void goToStep(activeStep - 1)}
          >
            Back
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void saveDraft()}>
            Save draft
          </Button>
          {activeStep < 4 ? (
            <Button type="button" disabled={saving} onClick={() => void goToStep(activeStep + 1)}>
              Next
            </Button>
          ) : (
            <Button type="button" disabled title="Launch — Sprint 6M-5">
              Launch campaign
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
