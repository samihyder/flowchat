'use client';

import { useEffect, useState } from 'react';
import type { CampaignControlPreview, MarketingCampaign } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { useModalFocus } from '@/components/marketing/ui/use-modal-focus';

function formatCampaignId(id: string) {
  return `CAM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

type Action = 'pause' | 'cancel';

type Props = {
  open: boolean;
  campaign: MarketingCampaign | null;
  preview: CampaignControlPreview | null;
  loading?: boolean;
  initialAction?: Action;
  onClose: () => void;
  onConfirm: (action: Action) => void;
};

export function CampaignControlModal({
  open,
  campaign,
  preview,
  loading,
  initialAction = 'pause',
  onClose,
  onConfirm,
}: Props) {
  const [action, setAction] = useState<Action>(initialAction);
  const panelRef = useModalFocus(open, onClose);

  useEffect(() => {
    if (open) setAction(initialAction);
  }, [open, initialAction]);

  if (!open || !campaign) return null;

  const recipients = preview?.queuedRecipients ?? campaign.recipientCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-[560px] rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="control-modal-title"
      >
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex justify-between items-start mb-1">
            <h3 id="control-modal-title" className="font-headline-md text-headline-md text-on-surface">
              Pause or Cancel Campaign?
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-on-surface transition-colors"
              aria-label="Close"
            >
              <MarketingIcon name="close" />
            </button>
          </div>
          <p className="font-data-mono text-data-mono text-primary flex items-center gap-2">
            <MarketingIcon name="tag" className="text-[14px]" />
            {formatCampaignId(campaign.id)}
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-primary-surface rounded-lg p-5 flex items-center gap-5 border border-primary-border">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
              <MarketingIcon name="groups" className="text-[28px]" filled />
            </div>
            <div>
              <p className="text-headline-sm font-headline-sm text-primary">
                {recipients.toLocaleString()} recipients
              </p>
              <p className="text-sm text-on-surface-variant">
                {preview?.pendingSends ?? 0} pending sends remaining in queue.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block group cursor-pointer">
              <input
                type="radio"
                name="modal-action"
                className="sr-only peer"
                checked={action === 'pause'}
                onChange={() => setAction('pause')}
              />
              <div className="p-4 rounded-xl border border-gray-200 peer-checked:border-primary peer-checked:bg-primary-surface/30 group-hover:border-primary-border transition-all flex gap-4">
                <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                  {action === 'pause' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="font-bold text-on-surface flex items-center gap-2">
                    <MarketingIcon name="pause_circle" className="text-[18px]" />
                    Pause Campaign
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">
                    Stops all new sends immediately. Emails currently sending will complete delivery.
                  </p>
                </div>
              </div>
            </label>

            <label className="block group cursor-pointer">
              <input
                type="radio"
                name="modal-action"
                className="sr-only peer"
                checked={action === 'cancel'}
                onChange={() => setAction('cancel')}
              />
              <div
                className={`p-4 rounded-xl border transition-all flex gap-4 group-hover:border-error ${
                  action === 'cancel'
                    ? 'border-error bg-status-danger-bg'
                    : 'border-gray-200'
                }`}
              >
                <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                  {action === 'cancel' && <div className="w-2.5 h-2.5 rounded-full bg-error" />}
                </div>
                <div>
                  <p className="font-bold text-on-surface flex items-center gap-2">
                    <MarketingIcon name="cancel" className="text-[18px]" />
                    Cancel Campaign
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">
                    Permanently stops the campaign and skips all pending sends. This cannot be undone.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-on-surface font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Keep Running
          </button>
          <button
            type="button"
            onClick={() => onConfirm(action)}
            disabled={loading}
            className={`px-5 py-2.5 rounded-lg font-bold text-white transition-colors disabled:opacity-60 ${
              action === 'cancel'
                ? 'bg-error hover:bg-error/90'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {loading ? 'Processing…' : action === 'cancel' ? 'Cancel Campaign' : 'Pause Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
