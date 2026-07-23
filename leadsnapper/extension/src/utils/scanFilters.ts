import type { SearchConfig } from '../types/lead'
import type { ScanLead } from '../types/scan'

/** Apply preset/search-config filters to captured scan leads. */
export function passesScanFilters(lead: ScanLead, cfg: SearchConfig): boolean {
  if (cfg.minimumRating != null && (lead.googleRating ?? 0) < cfg.minimumRating) return false
  if (cfg.minimumReviews != null && (lead.googleReviews ?? 0) < cfg.minimumReviews) return false
  if (cfg.websiteRequired && !lead.websiteUrl && !lead.enriched?.gmbWebsiteUrl) return false
  if (cfg.phoneRequired && !lead.phone && !lead.enriched?.primaryPhone && !lead.enriched?.gmbPhone) return false
  if (cfg.emailRequired) {
    const hasEmail = !!(lead.enriched?.primaryEmail || (lead.enriched?.emails?.length ?? 0) > 0)
    if (lead.enrichStatus === 'done' && !hasEmail) return false
    if (lead.enrichStatus !== 'done' && lead.enrichStatus !== 'pending' && lead.enrichStatus !== 'enriching') return false
  }
  return true
}

export function filterScanLeads(leads: ScanLead[], cfg: SearchConfig): { kept: ScanLead[]; configFiltered: number } {
  const kept = leads.filter(l => passesScanFilters(l, cfg))
  return { kept, configFiltered: leads.length - kept.length }
}

export function activeFilterLabels(cfg: SearchConfig): string[] {
  const labels: string[] = []
  if (cfg.minimumRating) labels.push(`Rating ≥ ${cfg.minimumRating}`)
  if (cfg.minimumReviews) labels.push(`Reviews ≥ ${cfg.minimumReviews}`)
  if (cfg.websiteRequired) labels.push('Website required')
  if (cfg.phoneRequired) labels.push('Phone required')
  if (cfg.emailRequired) labels.push('Email required')
  if (cfg.brandFit) labels.push(cfg.brandFit)
  if (cfg.city) labels.push(cfg.city)
  return labels
}
