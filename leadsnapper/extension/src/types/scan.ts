export type EnrichStatus = 'pending' | 'enriching' | 'done' | 'failed' | 'skipped'
export type LeadPriority = 'Hot' | 'Warm' | 'Cold'

export interface SocialLinks {
  linkedinCompany?: string
  linkedinPerson?: string
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  xTwitter?: string
  whatsapp?: string
}

export interface EnrichedData {
  // Contact
  emails: string[]
  phones: string[]
  primaryEmail?: string
  primaryPhone?: string

  // WhatsApp
  hasWhatsApp: boolean
  whatsappUrl?: string

  // Social
  social: SocialLinks
  socialPresenceScore: number

  // Website intel
  techStack: string[]
  hasChatWidget: boolean
  chatWidgetProvider?: string
  hasContactForm: boolean
  hasOnlineOrdering: boolean
  orderPageUrl?: string
  hasBookingSystem: boolean
  bookingUrl?: string
  hasNewsletter: boolean
  hasCareersPage: boolean
  hasPrivacyPolicy: boolean
  securitySignal: string

  // Business listings
  businessListings: string[]
  listingUrls: Record<string, string>

  // Company / legal signals
  mentionsCompanyReg: boolean
  companyNumberFound?: string
  mentionsTrademark: boolean
  mentionsDuns: boolean

  // Owner / people (from website, about page, schema.org)
  ownerName?: string
  ownerTitle?: string         // e.g. "Founder", "Managing Director", "CEO"
  ownerLinkedinUrl?: string   // LinkedIn /in/ profile (person, not company)
  ownerPhone?: string         // phone associated with owner if publicly listed
  teamMembers?: Array<{ name: string; title?: string; linkedinUrl?: string }>

  // Google My Business (populated when enriching a Maps lead)
  gmbWebsiteUrl?: string
  gmbPhone?: string
  gmbAddress?: string
  gmbCity?: string
  gmbCategory?: string
  gmbOpeningHours?: string
  gmbDescription?: string
  gmbRating?: number
  gmbReviews?: number

  // Meta
  metaTitle?: string
  metaDescription?: string
  aboutPageUrl?: string
  contactPageUrl?: string
  careersPageUrl?: string

  // Schema.org extras
  schemaPhone?: string
  schemaEmail?: string
  schemaAddress?: string
  schemaCity?: string

  enrichedAt: string
}

export interface ScanLead {
  id: string

  // Source
  sourceType: 'Google Maps' | 'Google Search'
  sourceUrl: string
  searchQuery?: string
  searchLocation?: string
  googleRank?: number

  // From results page (instant)
  businessName: string
  websiteUrl?: string
  domain?: string
  googleMapsUrl?: string
  category?: string
  googleRating?: number
  googleReviews?: number
  address?: string
  city?: string
  country?: string
  phone?: string           // visible on results page
  snippet?: string         // Google Search snippet / review snippet
  openStatus?: string      // "Open" / "Closed" / "Opens at..."
  priceRange?: string      // e.g. "£20–70" from Places card

  // Enrichment
  enrichStatus: EnrichStatus
  enrichError?: string
  enriched?: EnrichedData

  // Manual verification
  ownerName?: string
  directorName?: string
  directorRole?: string
  pscName?: string
  registeredCompanyName?: string
  registeredOfficeAddress?: string
  companyStatus?: string
  ownerLinkedinUrl?: string
  ownerVerified: boolean
  trademarkName?: string
  trademarkStatus?: string
  trademarkNotes?: string
  companyNumber?: string
  dunsNumber?: string
  clutchProfileUrl?: string
  userNotes?: string

  // Qualification
  brandFit?: string
  serviceFit: string[]
  leadScore: number
  leadPriority: LeadPriority

  // Explorium API enrichment
  exploriumData?: {
    ownerName?:          string
    ownerTitle?:         string
    ownerEmail?:         string   // work / professional email
    ownerPersonalEmail?: string   // personal email (Gmail, etc.)
    ownerPhone?:         string   // any phone
    ownerMobile?:        string   // mobile specifically
    ownerLinkedin?:      string
    businessId?:         string
    prospectId?:         string
    enrichedAt?:         string
    source?:             string
    // Companies House lookup details
    companiesHouseCompanyName?:       string
    companiesHouseCompanyNumber?:   string
    companiesHouseCompanyStatus?:   string
    companiesHouseRegisteredAddress?: string
    companiesHouseDirectorName?:    string
    companiesHouseDirectorRole?:    string
    companiesHousePscName?:         string
    companiesHouseOwnerType?:       'officers' | 'psc'
    companiesHouseMatched?:         boolean
    companiesHouseNoOwner?:         boolean
    openmartPeople?: Array<{
      name: string
      title?: string
      email?: string
      mobile?: string
      linkedin?: string
      phoneConfidence?: string
      lineType?: string
    }>
    mobileSource?: string
  }
  exploriumStatus?: 'loading' | 'done' | 'failed'
  exploriumError?:  string

  // UX state
  selected: boolean
  verified: boolean

  // Timestamps
  captureDate: string
  captureTime: string
}

// ── Scoring for ScanLead ─────────────────────────────────────────────────────

export function scoreScanLead(lead: ScanLead): { score: number; priority: LeadPriority } {
  let score = 0

  if (lead.phone || lead.enriched?.primaryPhone)                          score += 10
  if (lead.websiteUrl)                                                     score += 10
  if (lead.enriched?.primaryEmail)                                         score += 10
  if (lead.enriched?.social?.linkedinCompany)                              score += 10
  if (lead.enriched?.social?.facebook || lead.enriched?.social?.instagram) score += 5
  if (lead.enriched?.hasWhatsApp)                                          score += 5
  if (lead.enriched?.hasChatWidget === false)                              score += 10
  if (lead.enriched?.hasOnlineOrdering === false && isRestaurant(lead))    score += 15
  if (lead.enriched?.hasBookingSystem === false)                           score += 10
  if ((lead.googleReviews ?? 0) > 50)                                      score += 5
  if ((lead.googleReviews ?? 0) > 100)                                     score += 5
  if (typeof lead.googleRating === 'number' && lead.googleRating >= 4.0)   score += 5
  if (typeof lead.googleRating === 'number' && lead.googleRating < 4.0)    score += 5
  if ((lead.enriched?.businessListings?.length ?? 0) > 0)                 score += 5
  if (lead.enriched?.mentionsCompanyReg)                                   score += 5
  if (isRestaurant(lead))                                                  score += 20
  if (isEcommerce(lead))                                                   score += 20
  if (isConstruction(lead))                                                score += 25
  if (isCyber(lead))                                                       score += 20
  if (isOracle(lead))                                                      score += 40
  if (lead.ownerName || lead.directorName)                                 score += 10
  if (lead.city)                                                           score += 5

  const capped = Math.min(score, 100)
  const priority: LeadPriority = capped >= 70 ? 'Hot' : capped >= 40 ? 'Warm' : 'Cold'
  return { score: capped, priority }
}

function hay(lead: ScanLead): string {
  return [lead.businessName, lead.category, lead.snippet,
          lead.enriched?.metaDescription, lead.enriched?.metaTitle].join(' ').toLowerCase()
}
function isRestaurant(l: ScanLead) { return /restaurant|takeaway|cafe|café|bistro|diner|pizza|curry|kebab|sushi|food/.test(hay(l)) }
function isEcommerce(l: ScanLead) {
  return /shopify|woocommerce|ecommerce|e-commerce|online store|magento/.test(hay(l) + (l.enriched?.techStack ?? []).join(' ').toLowerCase())
}
function isConstruction(l: ScanLead) { return /construction|infrastructure|civil engineer|project controls|contractor|builder/.test(hay(l)) }
function isCyber(l: ScanLead) { return /saas|fintech|healthtech|healthcare|finance|nhs|insur/.test(hay(l)) }
function isOracle(l: ScanLead) { return /oracle|unifier|primavera|p6/.test(hay(l)) }

// ── Quick-lookup URL builders ────────────────────────────────────────────────

export function lookupUrls(lead: ScanLead) {
  const name   = encodeURIComponent(lead.businessName)
  const city   = encodeURIComponent(lead.city ?? '')
  const domain = encodeURIComponent(lead.domain ?? lead.websiteUrl ?? '')
  return {
    // Business registration
    companiesHouse:  `https://find-and-update.company-information.service.gov.uk/search?q=${name}`,
    ukipo:           `https://trademarks.ipo.gov.uk/ipo-tmcase/page/Results/1/${name}`,
    // Business listings
    clutch:          `https://clutch.co/search/company?query=${name}`,
    dnb:             `https://www.dnb.com/business-directory/company-information.html?SearchType=1&SearchTerms=${name}`,
    // Owner / director searches
    linkedinSearch:        `https://www.linkedin.com/search/results/companies/?keywords=${name}`,
    linkedinOwnerSearch:   `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(lead.businessName + ' owner director founder')}`,
    directorSearch:        `https://www.google.com/search?q=${name}+${city}+director+owner+founder`,
    companiesHouseOfficers: lead.enriched?.companyNumberFound
      ? `https://find-and-update.company-information.service.gov.uk/company/${lead.enriched.companyNumberFound}/officers`
      : `https://find-and-update.company-information.service.gov.uk/search?q=${name}`,
    // Top listings where owner info may appear
    yelpSearch:      `https://www.yelp.co.uk/search?find_desc=${name}&find_loc=${city}`,
    trustpilotSearch:`https://www.trustpilot.com/search?query=${name}`,
    // If domain known, find all mentions
    whoIsOwner:      domain ? `https://www.google.com/search?q=site:${domain}+owner+OR+founder+OR+director` : `https://www.google.com/search?q=${name}+${city}+owner+OR+founder+OR+director`,
  }
}
