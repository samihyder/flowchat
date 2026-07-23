import type { SearchConfig } from '../types/lead'

export function buildGoogleSearchQuery(cfg: SearchConfig): string {
  const parts: string[] = []

  if (cfg.keyword) parts.push(cfg.keyword)
  if (cfg.businessType && !cfg.keyword) parts.push(cfg.businessType)

  const location = [cfg.area, cfg.postalOrZipCode, cfg.city, cfg.regionOrState, cfg.country]
    .filter(Boolean)
    .join(' ')

  if (location) parts.push('in', location)

  return parts.join(' ')
}

export function buildGoogleMapsQuery(cfg: SearchConfig): string {
  const parts: string[] = []

  const business = cfg.keyword?.split(/\s+/)[0] || cfg.businessType || 'businesses'
  parts.push(business)

  const location = [cfg.area, cfg.postalOrZipCode, cfg.city].filter(Boolean).join(' ')
  if (location) parts.push('near', location)

  return parts.join(' ')
}

export function buildGoogleSearchUrl(cfg: SearchConfig): string {
  const q = encodeURIComponent(buildGoogleSearchQuery(cfg))
  return `https://www.google.com/search?q=${q}`
}

export function buildGoogleMapsUrl(cfg: SearchConfig): string {
  const q = encodeURIComponent(buildGoogleMapsQuery(cfg))
  return `https://www.google.com/maps/search/${q}`
}
