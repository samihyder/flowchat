import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  subscribed: 'Subscribed',
  unsubscribed: 'Unsubscribed',
  bounced: 'Bounced',
  complained: 'Complained',
  pending: 'Pending',
};

const STATUS_COLORS: Record<string, 'success' | 'gray' | 'warning' | 'primary'> = {
  subscribed: 'success',
  unsubscribed: 'gray',
  bounced: 'warning',
  complained: 'warning',
  pending: 'primary',
};

export function MarketingStatusBadge({ status }: { status?: string | null }) {
  const key = status ?? 'subscribed';
  return <Badge color={STATUS_COLORS[key] ?? 'gray'}>{STATUS_LABELS[key] ?? key}</Badge>;
}
