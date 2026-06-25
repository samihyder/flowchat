'use client';

import { useState, type ReactNode } from 'react';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
import { CampaignBuilderTopBar } from '@/components/marketing/ui/campaign-builder-topbar';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import type { MarketingCampaignStatus } from '@/lib/marketing/s6m-campaigns';

const STEPS = [
  { n: 1, label: 'Recipients' },
  { n: 2, label: 'Sequence' },
  { n: 3, label: 'Sender' },
  { n: 4, label: 'Review' },
] as const;

type CampaignWizardChromeProps = {
  name: string;
  onNameChange: (name: string) => void;
  onNameBlur?: () => void;
  campaignId: string;
  status: MarketingCampaignStatus;
  activeStep: number;
  onStepClick: (step: number) => void;
  footerLeft?: ReactNode;
  footerRight: ReactNode;
  children: ReactNode;
  error?: string;
  suppressedWarning?: boolean;
  onLaunch?: () => void;
  launchDisabled?: boolean;
};

function formatCampaignId(id: string) {
  return `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function CampaignWizardChrome({
  name,
  onNameChange,
  onNameBlur,
  campaignId,
  status,
  activeStep,
  onStepClick,
  footerLeft,
  footerRight,
  children,
  error,
  suppressedWarning,
  onLaunch,
  launchDisabled,
}: CampaignWizardChromeProps) {
  const [copied, setCopied] = useState(false);
  const formattedId = formatCampaignId(campaignId);

  const copyCampaignId = async () => {
    try {
      await navigator.clipboard.writeText(campaignId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <CampaignBuilderTopBar onLaunch={onLaunch} launchDisabled={launchDisabled} />

      <div className="bg-white border-b border-gray-200 px-8 py-6 sticky top-16 z-30 shrink-0">
        <div className="max-w-container-max-list mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={onNameBlur}
                placeholder="Enter campaign name..."
                className="text-headline-md text-on-surface border-none p-0 focus:ring-0 focus:border-b-2 focus:border-primary-border w-auto min-w-[200px] bg-transparent"
              />
              <CampaignStatusBadge status={status} />
              <button
                type="button"
                onClick={() => void copyCampaignId()}
                className="font-data-mono text-data-mono text-gray-400 ml-4 hover:text-primary transition-colors flex items-center gap-1"
                title="Copy campaign ID"
              >
                {formattedId}
                <MarketingIcon name={copied ? 'check' : 'content_copy'} className="text-[14px]" />
              </button>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-primary transition-colors"
              aria-label="More options"
            >
              <MarketingIcon name="more_horiz" />
            </button>
          </div>

          <nav className="flex items-center">
            {STEPS.map((s) => {
              const isActive = activeStep === s.n;
              const isComplete = activeStep > s.n;
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => onStepClick(s.n)}
                  className={`flex-1 flex items-center relative pb-1 border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary'
                      : isComplete
                        ? 'border-primary/40'
                        : 'border-gray-100 opacity-50'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold mr-3 ${
                      isActive
                        ? 'bg-primary text-on-primary'
                        : isComplete
                          ? 'bg-status-success-bg text-status-success-text'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? (
                      <MarketingIcon name="check" className="text-[14px]" />
                    ) : (
                      s.n
                    )}
                  </span>
                  <span
                    className={`text-sm ${
                      isActive
                        ? 'font-bold text-primary'
                        : isComplete
                          ? 'font-medium text-on-surface-variant'
                          : 'font-medium text-on-surface-variant'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8 pb-24">
        <div className="max-w-container-max-list mx-auto space-y-6">
          {error ? (
            <div className="rounded-lg border border-status-danger-bg bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text flex items-start gap-2">
              <MarketingIcon name="error" className="text-[20px] shrink-0 mt-0.5" />
              {error}
            </div>
          ) : null}
          {children}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-16 bg-white border-t border-gray-200 px-8 flex items-center justify-between shadow-2xl z-50">
        <div className="flex items-center gap-6 min-w-0">
          {footerLeft}
          {suppressedWarning ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-status-danger-bg text-status-danger-text rounded-lg text-xs font-bold">
              <MarketingIcon name="warning" className="text-sm" />
              <span>Suppressed contacts will be automatically excluded.</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-4 shrink-0">{footerRight}</div>
      </footer>
    </div>
  );
}
