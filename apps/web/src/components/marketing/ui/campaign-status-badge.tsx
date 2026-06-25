import type { MarketingCampaignStatus } from '@/lib/marketing/s6m-campaigns';

const STATUS_STYLES: Record<
  MarketingCampaignStatus,
  { bg: string; text: string; border?: string; label: string }
> = {
  draft: {
    bg: 'bg-status-draft-bg',
    text: 'text-status-draft-text',
    label: 'Draft',
  },
  scheduled: {
    bg: 'bg-status-scheduled-bg',
    text: 'text-status-scheduled-text',
    label: 'Scheduled',
  },
  running: {
    bg: 'bg-primary-surface',
    text: 'text-primary',
    border: 'border border-primary-border',
    label: 'Running',
  },
  paused: {
    bg: 'bg-status-paused-bg',
    text: 'text-status-paused-text',
    label: 'Paused',
  },
  completed: {
    bg: 'bg-status-success-bg',
    text: 'text-status-success-text',
    label: 'Completed',
  },
  cancelled: {
    bg: 'bg-status-danger-bg',
    text: 'text-status-danger-text',
    label: 'Cancelled',
  },
};

export function CampaignStatusBadge({ status }: { status: MarketingCampaignStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${style.border ?? ''}`}
    >
      {style.label}
    </span>
  );
}
