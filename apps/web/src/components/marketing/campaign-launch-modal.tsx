'use client';

import { useState } from 'react';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

type Props = {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  recipientCount: number;
  stepCount: number;
  onConfirm: () => Promise<void>;
};

export function CampaignLaunchModal({
  open,
  onClose,
  campaignName,
  recipientCount,
  stepCount,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-modal-title"
      >
        <div className="w-12 h-12 rounded-full bg-mkt-primary-surface text-mkt-primary flex items-center justify-center mx-auto">
          <MarketingIcon name="rocket_launch" className="text-[28px]" />
        </div>
        <h2 id="launch-modal-title" className="text-lg font-semibold text-gray-900 text-center">
          Launch campaign?
        </h2>
        <p className="text-sm text-gray-600 text-center">
          <strong>{campaignName}</strong> will send to{' '}
          <strong>{recipientCount}</strong> recipient{recipientCount === 1 ? '' : 's'} across{' '}
          <strong>{stepCount}</strong> email{stepCount === 1 ? '' : 's'}.
        </p>
        <p className="text-xs text-gray-500 text-center">
          Email content will be snapshotted. This action cannot be undone.
        </p>
        {error && (
          <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="flex-1 bg-mkt-primary hover:bg-mkt-primary-hover text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? 'Launching…' : 'Confirm launch'}
          </button>
        </div>
      </div>
    </div>
  );
}
