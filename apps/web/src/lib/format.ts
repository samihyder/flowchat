/** Relative time for activity columns (wireframe: "2 min ago"). */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function contactTypeBadgeClass(type: string): string {
  switch (type) {
    case 'lead':
      return 'bg-orange-100 text-orange-800';
    case 'customer':
      return 'bg-blue-100 text-blue-800';
    case 'visitor':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function initialsFromName(name: string | null | undefined): string {
  const safe = (name ?? '').trim();
  if (!safe) return '?';
  return (
    safe
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}
