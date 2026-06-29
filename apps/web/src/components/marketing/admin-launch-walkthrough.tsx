'use client';

import { useEffect, useState } from 'react';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

const STORAGE_KEY = 'flowchat-marketing-launch-walkthrough-dismissed';

type Props = {
  open: boolean;
  onClose: () => void;
};

const STEPS = [
  {
    title: 'Review pre-flight checks',
    body: 'Confirm provider, domain, recipients, merge tags, and test email before launch.',
    icon: 'fact_check' as const,
  },
  {
    title: 'Verify your audience',
    body: 'Scan the recipient table and open Edit recipients if you need to adjust who receives this campaign.',
    icon: 'group' as const,
  },
  {
    title: 'Launch with confidence',
    body: 'When all checks pass, use Launch Campaign. Scheduled sends start automatically via the background scheduler.',
    icon: 'rocket_launch' as const,
  },
];

export function AdminLaunchWalkthrough({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step]!;
  const isLast = step >= STEPS.length - 1;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-walkthrough-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-br from-primary to-primary-container px-6 py-8 text-white relative">
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close walkthrough"
          >
            <MarketingIcon name="close" />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
            Admin launch guide
          </p>
          <h2 id="launch-walkthrough-title" className="text-headline-sm font-bold">
            {current.title}
          </h2>
          <div className="mt-6 w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <MarketingIcon name={current.icon} className="text-3xl" />
          </div>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-on-surface-variant leading-relaxed">{current.body}</p>
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between items-center gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="text-sm text-on-surface-variant font-medium hover:text-on-surface"
            >
              Skip tour
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={dismiss}
                className="bg-primary text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-primary-hover"
              >
                Got it
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="bg-primary text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-primary-hover"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowLaunchWalkthrough(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}
