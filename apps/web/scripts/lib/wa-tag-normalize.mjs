/**
 * Normalize Mutex WA CRM tags to the qualified set:
 * PTA, Operator:*, App:*, flowchat-sync, International, Pakistan Client,
 * Country:*, CTDISR, and vertical names (no prefix).
 *
 * Drops Source/Confidence/Category prefixes, URL-heavy app tags, and
 * legacy geo/export noise. System CRM tags are preserved.
 */

/** Tags that stay exactly as-is (CRM system + segment). */
export const QUALIFIED_PLAIN_TAGS = new Set([
  'PTA',
  'CTDISR',
  'International',
  'Pakistan Client',
  'flowchat-sync',
  'Deal Won',
  'Existing Customer',
  'In-Discussion',
  'Lead',
  'Outreach',
]);

/** Plain tags from old imports / exports — safe to remove. */
const DISCARD_PLAIN_TAGS = new Set([
  'africa',
  'asia',
  'australia',
  'canada',
  'europe',
  'latin_america',
  'middle_east',
  'cleaned_leads',
  'contacts_export',
  'leadgen_consolidated',
  'International', // kept via QUALIFIED — listed for clarity
]);

const LEGACY_SEGMENT = {
  'Segment:PTA': 'PTA',
  'Segment:Pakistani': 'Pakistan Client',
  'Segment:International': 'International',
};

function simplifyOperatorName(raw) {
  return raw
    .replace(/\s*\(Pvt\.?\)\s*(Ltd\.?)?/gi, '')
    .replace(/\s*\(Private\)\s*(Limited)?/gi, '')
    .replace(/\s*Ltd\.?$/i, '')
    .replace(/\s*Limited$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function simplifyAppName(raw) {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    const playId = value.match(/[?&]id=([a-zA-Z0-9._]+)/);
    if (playId) {
      const parts = playId[1].split('.');
      const leaf = parts[parts.length - 1];
      if (leaf && leaf.length <= 40) return leaf;
    }
    try {
      const host = new URL(value).hostname.replace(/^www\./, '');
      const bit = host.split('.')[0];
      if (bit && bit.length <= 30) return bit;
    } catch {
      // ignore
    }
    return null; // generic App only
  }
  if (value.length > 50) return `${value.slice(0, 47).trim()}...`;
  return value;
}

function maybeAddCtdisr(tags, hint) {
  if (!hint) return;
  if (/ctdisr|ctd\s*isr|ctdsir|ctd\s*sir/i.test(hint)) tags.add('CTDISR');
}

/**
 * @param {string} tag
 * @param {{ ctdisrHint?: string }} [opts]
 * @returns {string[]}
 */
export function normalizeWaTag(tag, opts = {}) {
  const raw = tag?.trim();
  if (!raw) return [];

  if (LEGACY_SEGMENT[raw]) return [LEGACY_SEGMENT[raw]];

  if (QUALIFIED_PLAIN_TAGS.has(raw)) return [raw];

  if (DISCARD_PLAIN_TAGS.has(raw.toLowerCase())) return [];

  if (raw.startsWith('Source:')) return [];
  if (raw.startsWith('Confidence:')) return [];

  if (raw.startsWith('Vertical:')) {
    const name = raw.slice('Vertical:'.length).trim();
    return name ? [name] : [];
  }

  if (raw.startsWith('Category:')) {
    const name = raw.slice('Category:'.length).trim();
    return name ? [name] : [];
  }

  if (raw.startsWith('Operator:')) {
    const name = simplifyOperatorName(raw.slice('Operator:'.length));
    const out = new Set();
    if (name) {
      out.add(`Operator:${name}`);
      maybeAddCtdisr(out, name);
    }
    return [...out];
  }

  if (raw.startsWith('App:')) {
    const short = simplifyAppName(raw.slice('App:'.length));
    return short ? [`App:${short}`] : ['App'];
  }

  if (raw.startsWith('Country:')) {
    const country = raw.slice('Country:'.length).trim();
    return country ? [`Country:${country}`] : [];
  }

  // Unknown plain tag — keep only if it looks like a short vertical/industry label.
  if (raw.length <= 40 && !raw.includes('http') && !raw.includes('@')) {
    return [raw];
  }

  return [];
}

/**
 * @param {string[]} tags
 * @param {{ ctdisrHint?: string }} [opts]
 * @returns {string[]}
 */
export function normalizeWaTags(tags, opts = {}) {
  const out = new Set();
  for (const tag of tags) {
    for (const normalized of normalizeWaTag(tag, opts)) {
      out.add(normalized);
    }
  }
  maybeAddCtdisr(out, opts.ctdisrHint);
  return [...out].sort();
}

export function buildImportTags(fileKey, row, extra = [], opts = {}) {
  const tags = new Set([FILE_TAG[fileKey]]);

  for (const item of extra) {
    for (const t of normalizeWaTag(item, opts)) tags.add(t);
  }

  const country = row.country || row.Country;
  if (country?.trim()) {
    tags.add(`Country:${country.trim()}`);
  }

  maybeAddCtdisr(tags, opts.ctdisrHint);
  return [...tags];
}

export const FILE_TAG = {
  pta: 'PTA',
  pakistani: 'Pakistan Client',
  international: 'International',
};
