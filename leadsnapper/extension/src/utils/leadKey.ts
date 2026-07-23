import type { ScanLead } from '../types/scan'

/** Stable key so re-scans merge instead of duplicating businesses. */
export function leadStableKey(lead: Partial<ScanLead>): string {
  const maps = lead.googleMapsUrl || (lead.sourceUrl?.includes('/maps/place/') ? lead.sourceUrl : '')
  if (maps) {
    try {
      const u = new URL(maps)
      const cid = u.searchParams.get('cid')
      if (cid) return `maps:cid:${cid}`
      const q = u.searchParams.get('q')
      if (q?.includes('place_id:')) return `maps:${q}`
      return `maps:${u.pathname.split('@')[0]}`
    } catch {
      return `maps:${maps.split('?')[0]}`
    }
  }
  const name = (lead.businessName ?? '').toLowerCase().trim()
  const addr = (lead.address ?? lead.city ?? '').toLowerCase().trim()
  if (name) return `biz:${name}|${addr}`
  return lead.id ?? `unknown:${Math.random()}`
}

/** Merge incoming scan rows into existing — preserve enrichment & owner data. */
export function mergeScanLeads(existing: ScanLead[], incoming: ScanLead[]): ScanLead[] {
  const byKey = new Map<string, ScanLead>()
  for (const l of existing) byKey.set(leadStableKey(l), l)

  for (const raw of incoming) {
    const key = leadStableKey(raw)
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, raw)
      continue
    }
    // Update visible card fields only; never reset completed enrichment
    byKey.set(key, {
      ...prev,
      businessName:  raw.businessName  || prev.businessName,
      category:      raw.category      || prev.category,
      googleRating:  raw.googleRating  ?? prev.googleRating,
      googleReviews: raw.googleReviews ?? prev.googleReviews,
      address:       raw.address       || prev.address,
      city:          raw.city          || prev.city,
      phone:         raw.phone         || prev.phone,
      websiteUrl:    raw.websiteUrl    || prev.websiteUrl,
      domain:        raw.domain        || prev.domain,
      openStatus:    raw.openStatus    || prev.openStatus,
      priceRange:    raw.priceRange    || prev.priceRange,
      snippet:       raw.snippet       || prev.snippet,
      googleRank:    raw.googleRank    ?? prev.googleRank,
      searchQuery:   raw.searchQuery   || prev.searchQuery,
      googleMapsUrl: raw.googleMapsUrl || prev.googleMapsUrl,
      sourceUrl:     prev.sourceUrl?.includes('/maps/place/') ? prev.sourceUrl : (raw.sourceUrl || prev.sourceUrl),
    })
  }
  return [...byKey.values()]
}
