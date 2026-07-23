import type { ScanLead } from '../types/scan'

const NON_BUSINESS_HOSTS = new Set([
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
  'youtube.com', 'linkedin.com', 'linktr.ee', 'bit.ly', 'goo.gl',
  'google.com', 'google.co.uk', 'maps.google.com',
  'yelp.com', 'yelp.co.uk', 'tripadvisor.com', 'tripadvisor.co.uk',
  'justeat.co.uk', 'deliveroo.co.uk', 'ubereats.com',
  'opentable.com', 'fresha.com', 'booksy.com',
])

function hostFromUrl(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.replace(/^www\./, '').toLowerCase()
  }
}

/** Real business website domain — skips social, delivery, and aggregator links. */
export function businessDomainFromLead(lead: ScanLead): string {
  const candidates = [
    lead.domain,
    lead.websiteUrl,
    lead.enriched?.gmbWebsiteUrl,
  ].filter(Boolean) as string[]

  for (const raw of candidates) {
    const host = hostFromUrl(raw)
    if (!host || host.length < 4) continue
    const blocked = [...NON_BUSINESS_HOSTS].some(b => host === b || host.endsWith(`.${b}`))
    if (!blocked) return host
  }
  return ''
}
