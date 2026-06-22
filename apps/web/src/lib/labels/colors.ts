/** Preset swatches + helpers for label colors. */
export const LABEL_COLOR_PRESETS = [
  '#6366F1', // indigo (brand)
  '#4F46E5', // indigo dark
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#EAB308', // yellow
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#EC4899', // pink
  '#64748B', // slate
  '#6B7280', // gray
  '#78716C', // stone
] as const;

const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const HEX3 = /^#[0-9A-Fa-f]{3}$/;

export function normalizeLabelColor(color?: string | null, fallback = '#6366F1'): string {
  const raw = color?.trim();
  if (!raw) return fallback;
  if (HEX6.test(raw)) return raw.toUpperCase();
  if (HEX3.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

export function isValidLabelColor(color: string): boolean {
  const n = normalizeLabelColor(color, '');
  return n.length === 7 && HEX6.test(n);
}
