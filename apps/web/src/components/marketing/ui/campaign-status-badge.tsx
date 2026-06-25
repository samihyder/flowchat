import type { MarketingCampaignStatus } from '@/lib/marketing/s6m-campaigns';

const STATUS_STYLES: Record<
  MarketingCampaignStatus,
  { bg: string; text: string; border?: string; label: string }
> = {
  draft: {
    bg: 'bg-mkt-status-draft-bg',
    text: 'text-mkt-status-draft-text',
    label: 'Draft',
  },
  scheduled: {
    bg: 'bg-mkt-status-scheduled-bg',
    text: 'text-mkt-status-scheduled-text',
    label: 'Scheduled',
  },
  running: {
    bg: 'bg-mkt-primary-surface',
    text: 'text-mkt-primary',
    border: 'border border-mkt-primary-border',
    label: 'Running',
  },
  paused: {
    bg: 'bg-mkt-status-paused-bg',
    text: 'text-mkt-status-paused-text',
    label: 'Paused',
  },
  completed: {
    bg: 'bg-mkt-status-success-bg',
    text: 'text-mkt-status-success-text',
    label: 'Completed',
  },
  cancelled: {
    bg: 'bg-mkt-status-danger-bg',
    text: 'text-mkt-status-danger-text',
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
