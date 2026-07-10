import type { Label } from '@/lib/api';

export type DefaultLabelDef = { name: string; color: string; description: string };

/** Recommended Mutex / LeadSnapper sales labels — upserted via Settings → Labels → Add recommended. */
export const RECOMMENDED_LABELS: DefaultLabelDef[] = [
  { name: 'Hot Lead', color: '#EF4444', description: 'High-priority LeadSnapper prospect — call first' },
  { name: 'Warm Lead', color: '#F59E0B', description: 'Good fit — follow up this week' },
  { name: 'Mutex', color: '#06B6D4', description: 'Mutex Systems opportunity' },
  { name: 'Nexus', color: '#8B5CF6', description: 'NexusCorp opportunity' },
  { name: 'UK', color: '#3B82F6', description: 'United Kingdom market' },
  { name: 'US', color: '#10B981', description: 'United States market' },
  { name: 'Sales', color: '#0891B2', description: 'Sales enquiry (live chat or outbound)' },
  { name: 'Support', color: '#14B8A6', description: 'Existing customer or support issue' },
  { name: 'Follow-up', color: '#EC4899', description: 'Needs callback or second touch' },
  { name: 'No Chat Widget', color: '#64748B', description: 'Prospect has no website chat — upsell angle' },
];

export function missingRecommendedLabels(existing: Label[]): DefaultLabelDef[] {
  const names = new Set(existing.map((l) => l.name.toLowerCase()));
  return RECOMMENDED_LABELS.filter((d) => !names.has(d.name.toLowerCase()));
}
