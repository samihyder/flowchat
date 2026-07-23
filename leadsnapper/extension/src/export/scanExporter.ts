import * as XLSX from 'xlsx'
import type { ScanLead } from '../types/scan'
import { lookupUrls } from '../types/scan'

function fmt(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function leadToRow(l: ScanLead): Record<string, string> {
  const e   = l.enriched
  const lu  = lookupUrls(l)
  const soc = e?.social ?? {}

  return {
    // Identity
    'Capture Date':           l.captureDate,
    'Capture Time':           l.captureTime,
    'Source Type':            l.sourceType,
    'Search Query':           fmt(l.searchQuery),
    'Google Rank':            fmt(l.googleRank),
    'Lead Score':             String(l.leadScore),
    'Priority':               l.leadPriority,

    // Business
    'Business Name':          l.businessName,
    'Category':               fmt(l.category),
    'Website':                fmt(l.websiteUrl),
    'Domain':                 fmt(l.domain),
    'Google Maps URL':        fmt(l.googleMapsUrl),
    'Source URL':             fmt(l.sourceUrl),

    // Location
    'Address':                fmt(l.address),
    'City':                   fmt(l.city),
    'Country':                fmt(l.country ?? 'United Kingdom'),

    // Contact (from search results)
    'Phone (Search)':         fmt(l.phone),
    'Snippet':                fmt(l.snippet),
    'Opening Status':         fmt(l.openStatus),
    'Price Range':            fmt(l.priceRange),
    'Review Snippet':         fmt(l.snippet),

    // Google signals
    'Google Rating':          fmt(l.googleRating),
    'Google Reviews':         fmt(l.googleReviews),

    // Enriched contact
    'Primary Email':          fmt(e?.primaryEmail),
    'Primary Phone':          fmt(e?.primaryPhone),
    'All Emails':             fmt(e?.emails),
    'All Phones':             fmt(e?.phones),

    // WhatsApp
    'Has WhatsApp':           fmt(e?.hasWhatsApp),
    'WhatsApp URL':           fmt(e?.whatsappUrl),

    // Social
    'LinkedIn Company':       fmt(soc.linkedinCompany),
    'LinkedIn Person':        fmt(soc.linkedinPerson),
    'Facebook':               fmt(soc.facebook),
    'Instagram':              fmt(soc.instagram),
    'TikTok':                 fmt(soc.tiktok),
    'YouTube':                fmt(soc.youtube),
    'X / Twitter':            fmt(soc.xTwitter),
    'Social Presence Score':  fmt(e?.socialPresenceScore),

    // Website intelligence
    'Technology Stack':       fmt(e?.techStack),
    'Chat Widget':            fmt(e?.chatWidgetProvider ?? (e?.hasChatWidget === false ? 'None' : '')),
    'Has Contact Form':       fmt(e?.hasContactForm),
    'Has Online Ordering':    fmt(e?.hasOnlineOrdering),
    'Order Page URL':         fmt(e?.orderPageUrl),
    'Has Booking System':     fmt(e?.hasBookingSystem),
    'Booking URL':            fmt(e?.bookingUrl),
    'Has Newsletter':         fmt(e?.hasNewsletter),
    'Has Careers Page':       fmt(e?.hasCareersPage),
    'Has Privacy Policy':     fmt(e?.hasPrivacyPolicy),
    'Security Signal':        fmt(e?.securitySignal),
    'Meta Title':             fmt(e?.metaTitle),
    'Meta Description':       fmt(e?.metaDescription),
    'About Page URL':         fmt(e?.aboutPageUrl),
    'Contact Page URL':       fmt(e?.contactPageUrl),

    // Business listings
    'Business Listings':      fmt(e?.businessListings),
    'Listing URLs':           e?.listingUrls ? Object.entries(e.listingUrls).map(([k,v]) => `${k}: ${v}`).join(' | ') : '',

    // Company / legal signals
    'Company Reg Mentioned':  fmt(e?.mentionsCompanyReg),
    'Company Number Found':   fmt(e?.companyNumberFound),
    'Trademark Mentioned':    fmt(e?.mentionsTrademark),
    'DUNS Mentioned':         fmt(e?.mentionsDuns),

    // Google My Business (from Maps place page)
    'GMB Website':        fmt(e?.gmbWebsiteUrl),
    'GMB Phone':          fmt(e?.gmbPhone),
    'GMB Address':        fmt(e?.gmbAddress),
    'GMB City':           fmt(e?.gmbCity),
    'GMB Category':       fmt(e?.gmbCategory),
    'GMB Opening Hours':  fmt(e?.gmbOpeningHours),
    'GMB Description':    fmt(e?.gmbDescription),
    'GMB Rating':         fmt(e?.gmbRating),
    'GMB Reviews':        fmt(e?.gmbReviews),

    // Explorium API enrichment
    'API Owner Name':    fmt(l.exploriumData?.ownerName),
    'API Owner Title':   fmt(l.exploriumData?.ownerTitle),
    'API Owner Email':   fmt(l.exploriumData?.ownerEmail),
    'API Owner Mobile':  fmt(l.exploriumData?.ownerMobile),
    'API Owner Phone':   fmt(l.exploriumData?.ownerPhone),
    'API Owner LinkedIn':fmt(l.exploriumData?.ownerLinkedin),
    'API Mobile Source': fmt(l.exploriumData?.mobileSource || l.exploriumData?.source),
    'Openmart Contacts': fmt(l.exploriumData?.openmartPeople?.map(p =>
      `${p.name}${p.title ? ` (${p.title})` : ''}${p.mobile ? ` ${p.mobile}` : ''}`,
    )),
    'API Enrich Status': fmt(l.exploriumStatus),
    'API Enriched At':   fmt(l.exploriumData?.enrichedAt),

    // Owner / Director (auto-detected + manual)
    'Owner Name':             fmt(l.ownerName     || e?.ownerName),
    'Owner Title':            fmt(e?.ownerTitle),
    'Owner Phone':            fmt(e?.ownerPhone),
    'Owner LinkedIn (Person)':fmt(e?.ownerLinkedinUrl || l.ownerLinkedinUrl),
    'Director Name':          fmt(l.directorName),
    'Director Role':          fmt(l.directorRole),
    'PSC Name':               fmt(l.pscName),
    'Registered Company':     fmt(l.registeredCompanyName),
    'Registered Office':      fmt(l.registeredOfficeAddress),
    'Company Status':         fmt(l.companyStatus),
    'Owner Verified':         fmt(l.ownerVerified),
    'Team Members':           fmt(e?.teamMembers?.map(m => `${m.name}${m.title ? ` (${m.title})` : ''}`)),

    // Trademark / Registration
    'Company Number':         fmt(l.companyNumber),
    'DUNS Number':            fmt(l.dunsNumber),
    'Trademark Name':         fmt(l.trademarkName),
    'Trademark Status':       fmt(l.trademarkStatus),
    'Trademark Notes':        fmt(l.trademarkNotes),
    'Clutch Profile URL':     fmt(l.clutchProfileUrl),

    // Lookup links (for manual verification)
    'Companies House URL':    lu.companiesHouse,
    'UKIPO Search URL':       lu.ukipo,
    'Clutch Search URL':      lu.clutch,
    'D&B Search URL':         lu.dnb,
    'LinkedIn Search URL':    lu.linkedinSearch,
    'Director Search URL':    lu.directorSearch,

    // Qualification
    'Brand Fit':              fmt(l.brandFit),
    'Service Fit':            fmt(l.serviceFit),

    // Compliance
    'Outreach Basis':         'Legitimate Interest - B2B',
    'Opt-out Status':         'Active',

    // Notes
    'Notes':                  fmt(l.userNotes),
    'Verified by User':       fmt(l.verified),
    'Enrich Status':          l.enrichStatus,
    'Enriched At':            fmt(l.enriched?.enrichedAt),
  }
}

export function exportScanLeads(leads: ScanLead[], query?: string): void {
  if (leads.length === 0) return

  const now     = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`

  const wb = XLSX.utils.book_new()

  // Sheet 1 – Leads
  const rows = leads.map(leadToRow)
  const ws1  = XLSX.utils.json_to_sheet(rows)
  ws1['!cols']       = Object.keys(rows[0] ?? {}).map(k => ({ wch: Math.max(k.length + 2, 14) }))
  ws1['!freeze']     = { xSplit: 0, ySplit: 1 }
  ws1['!autofilter'] = { ref: ws1['!ref'] ?? 'A1' }
  XLSX.utils.book_append_sheet(wb, ws1, 'Leads')

  // Sheet 2 – Summary
  const hot  = leads.filter(l => l.leadPriority === 'Hot').length
  const warm = leads.filter(l => l.leadPriority === 'Warm').length
  const done = leads.filter(l => l.enrichStatus === 'done').length
  const summaryRows = [
    ['Export Date',        dateStr],
    ['Export Time',        timeStr],
    ['Search Query',       query ?? ''],
    ['Total Leads',        String(leads.length)],
    ['Hot Leads',          String(hot)],
    ['Warm Leads',         String(warm)],
    ['Cold Leads',         String(leads.length - hot - warm)],
    ['Enriched',           String(done)],
    ['Avg Lead Score',     String(Math.round(leads.reduce((s, l) => s + l.leadScore, 0) / leads.length))],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows)
  ws2['!cols'] = [{ wch: 22 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  XLSX.writeFile(wb, `LeadSnapper_${dateStr}_${timeStr}.xlsx`)
}
