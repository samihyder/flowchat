'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { CampaignStatusBadge } from '@/components/marketing/ui/campaign-status-badge';
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
}: CampaignWizardChromeProps) {
  const copyCampaignId = async () => {
    try {
      await navigator.clipboard.writeText(campaignId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-white border-b border-gray-200 px-6 lg:px-8 py-6 shrink-0 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={onNameBlur}
                placeholder="Enter campaign name…"
                className="text-2xl font-semibold text-gray-900 border-none p-0 focus:ring-0 focus:outline-none bg-transparent min-w-[200px] max-w-full"
              />
              <CampaignStatusBadge status={status} />
              <button
                type="button"
                onClick={() => void copyCampaignId()}
                className="text-xs text-gray-400 hover:text-mkt-primary"
                style={{ fontFamily: 'var(--font-mkt-mono)' }}
                title="Copy campaign ID"
              >
                {formatCampaignId(campaignId)}
              </button>
            </div>
            <Link
              href={'/marketing/campaigns' as Route}
              className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 shrink-0"
            >
              <MarketingIcon name="arrow_back" className="text-[18px]" />
              Back to list
            </Link>
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
                  className={`flex-1 flex items-center relative pb-2 border-b-2 transition-colors ${
                    isActive
                      ? 'border-mkt-primary'
                      : isComplete
                        ? 'border-mkt-status-success-text/40'
                        : 'border-gray-100 opacity-60'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold mr-3 ${
                      isActive
                        ? 'bg-mkt-primary text-white'
                        : isComplete
                          ? 'bg-mkt-status-success-bg text-mkt-status-success-text'
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
                      isActive ? 'font-bold text-mkt-primary' : 'font-medium text-gray-500'
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

      <div className="flex-1 overflow-auto px-6 lg:px-8 py-8">
        <div className="max-w-[1280px] mx-auto">
          {error ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <MarketingIcon name="error" className="text-[20px] shrink-0 mt-0.5" />
              {error}
            </div>
          ) : null}
          {children}
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-white px-6 lg:px-8 py-4 flex items-center justify-between shrink-0">
        <div className="text-sm text-gray-500">{footerLeft}</div>
        <div className="flex gap-2 flex-wrap justify-end">{footerRight}</div>
      </footer>
    </div>
  );
}
