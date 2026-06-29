'use client';

import { useState } from 'react';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { useModalFocus } from '@/components/marketing/ui/use-modal-focus';

type Props = {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  recipientCount: number;
  stepCount: number;
  firstSendLabel?: string;
  onConfirm: () => Promise<void>;
};

export function CampaignLaunchModal({
  open,
  onClose,
  campaignName,
  recipientCount,
  stepCount,
  firstSendLabel = 'Immediate send',
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useModalFocus(open, onClose);

  if (!open) return null;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative bg-white w-full max-w-lg rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-modal-title"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 id="launch-modal-title" className="text-headline-md">
            Ready to Launch?
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <MarketingIcon name="close" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-surface rounded-full flex items-center justify-center text-primary shrink-0">
              <MarketingIcon name="send" className="text-3xl" />
            </div>
            <div>
              <p className="text-label-caps text-gray-500 uppercase tracking-widest">
                Recipient Impact Summary
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {recipientCount.toLocaleString()} Recipient{recipientCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-4 bg-status-success-bg/30 rounded-lg border border-status-success-bg">
              <MarketingIcon name="verified" className="text-status-success-text mt-0.5 shrink-0" />
              <p className="text-sm text-on-surface-variant">
                <strong className="text-gray-900">{campaignName}</strong> is ready to deploy across{' '}
                <strong>{stepCount}</strong> email{stepCount === 1 ? '' : 's'}. Content will be
                snapshotted at launch.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <h4 className="text-xs font-bold text-gray-900 mb-2 uppercase">Scheduled Delivery</h4>
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <MarketingIcon name="schedule" className="text-xs" />
                <span>{firstSendLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-status-danger-bg/20 border-l-4 border-status-danger-text p-4">
            <div className="flex items-center gap-2 text-status-danger-text mb-1">
              <MarketingIcon name="warning" className="text-sm" />
              <span className="text-xs font-bold uppercase">Irreversible Action</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Once you click launch, emails will begin queuing immediately. This action cannot be
              undone.
            </p>
          </div>

          {error && (
            <p className="text-sm text-status-danger-text mt-4 bg-status-danger-bg rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-6 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-md text-sm disabled:opacity-60"
          >
            {busy ? 'Launching…' : 'Launch Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
