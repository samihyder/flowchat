import type { Conversation } from '@/lib/api';

const STATUS_STYLES: Record<Conversation['status'], string> = {
  open: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  resolved: 'bg-gray-100 text-gray-700',
  snoozed: 'bg-blue-100 text-blue-800',
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: Conversation['status'] }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority || priority === 'medium') return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low}`}
    >
      {priority === 'urgent' ? '🔥 Urgent' : priority}
    </span>
  );
}

export function LabelPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}
