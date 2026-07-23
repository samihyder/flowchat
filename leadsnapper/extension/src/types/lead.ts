export type BrandFit = string

export type SourceType =
  | 'Google Search'
  | 'Google Maps'
  | 'GMB'
  | 'Website'
  | 'LinkedIn'
  | 'Facebook'
  | 'Instagram'
  | 'TikTok'
  | 'YouTube'
  | 'Twitter'
  | 'Threads'
  | 'Directory'
  | 'Manual'

export type LeadStatus =
  | 'New'
  | 'Verified'
  | 'Contacted'
  | 'Follow-up Required'
  | 'Meeting Booked'
  | 'Proposal Sent'
  | 'Won'
  | 'Lost'
  | 'Not Relevant'

export type LeadPriority = 'Hot' | 'Warm' | 'Cold'

export type CrmSyncStatus = 'not_synced' | 'pending' | 'synced' | 'failed'

export interface Lead {
  leadId: string
  exportBatchId?: string
  captureDate: string
  captureTime: string
  sourceType: SourceType
  sourceUrl: string
  searchKeyword?: string
  searchQueryUsed?: string
  googleRank?: number

  // Location
  targetMarket?: string
  country?: string
  regionOrState?: string
  county?: string
  city?: string
  area?: string
  postalOrZipCode?: string

  // Business identity
  businessName?: string
  website?: string
  domain?: string
  industry?: string
  category?: string
  address?: string
  phone?: string
  email?: string

  // Online presence
  linkedinUrl?: string
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  youtubeUrl?: string
  xTwitterUrl?: string
  threadsUrl?: string
  whatsappUrl?: string

  // Google signals
  googleRating?: number
  googleReviews?: number
  openingHours?: string

  // Website intelligence
  technologyDetected?: string[]
  hasWebsite?: boolean
  hasContactForm?: boolean
  hasChatWidget?: boolean
  hasOnlineOrdering?: boolean
  hasBookingSystem?: boolean
  securitySignal?: string

  // Owner
  ownerName?: string
  directorName?: string
  decisionMakerLinkedin?: string
  ownerDataConfidence?: 'Low' | 'Medium' | 'High'

  // Qualification
  brandFit: BrandFit
  serviceFit: string[]
  leadScore: number
  leadPriority: LeadPriority
  leadStatus: LeadStatus

  // Sales
  assignedTo?: string
  notes?: string
  nextAction?: string
  followUpDate?: string

  // Compliance
  complianceRegion?: string
  outreachBasis: string
  optOutStatus: 'Active' | 'Opted Out'
  doNotContact: boolean
  suppressionReason?: string

  // CRM sync (reserved — no live integration yet)
  crmLeadId?: string
  crmContactId?: string
  crmSyncStatus: CrmSyncStatus
  crmSyncError?: string

  // Extended fields (populated from scan / enrich pipeline for export)
  primaryEmail?: string
  allEmails?: string[]
  allPhones?: string[]
  ownerTitle?: string
  ownerPhone?: string
  ownerMobile?: string
  ownerWorkEmail?: string
  ownerPersonalEmail?: string
  b2bSource?: string
  mobileSource?: string
  companiesHouseMatched?: boolean
  gmbWebsite?: string
  gmbPhone?: string
  gmbAddress?: string
  gmbCategory?: string
  gmbOpeningHours?: string
  gmbDescription?: string
  gmbRating?: number
  gmbReviews?: number
  chatWidgetProvider?: string
  hasWhatsApp?: boolean
  orderPageUrl?: string
  bookingUrl?: string
  hasNewsletter?: boolean
  hasCareersPage?: boolean
  hasPrivacyPolicy?: boolean
  metaTitle?: string
  metaDescription?: string
  socialPresenceScore?: number
  businessListings?: string[]
  companyNumberFound?: string
  mentionsTrademark?: boolean
  mentionsDuns?: boolean
  mentionsCompanyReg?: boolean
  googleMapsUrl?: string
  openStatus?: string
  priceRange?: string
  teamMembersJson?: string
  userVerified?: boolean
}

export type PartialLead = Partial<Lead>

export interface SearchConfig {
  targetMarket: 'UK' | 'USA' | 'UAE' | 'Canada' | 'Australia' | 'EU' | 'Custom'
  country: string
  regionOrState?: string
  county?: string
  city?: string
  area?: string
  postalOrZipCode?: string
  radiusMiles?: number
  businessType?: string
  industry?: string
  keyword?: string
  minimumRating?: number
  minimumReviews?: number
  websiteRequired?: boolean
  phoneRequired?: boolean
  emailRequired?: boolean
  brandFit?: BrandFit
  serviceFit?: string[]
  complianceRegion?: string
}

export interface SessionState {
  leads: Lead[]
  sessionId: string
  startTime: string
  searchConfig: SearchConfig
}

export interface ExtractedPageData {
  sourceType: SourceType
  sourceUrl: string
  businessName?: string
  website?: string
  domain?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
  category?: string
  industry?: string
  ownerName?: string
  decisionMakerLinkedin?: string
  googleRating?: number
  googleReviews?: number
  openingHours?: string
  hasWebsite?: boolean
  linkedinUrl?: string
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  youtubeUrl?: string
  xTwitterUrl?: string
  threadsUrl?: string
  whatsappUrl?: string
  technologyDetected?: string[]
  hasContactForm?: boolean
  hasChatWidget?: boolean
  hasOnlineOrdering?: boolean
  hasBookingSystem?: boolean
  securitySignal?: string
  searchKeyword?: string
  googleRank?: number
  // Google Search results (array of results on the page)
  searchResults?: SearchResult[]
}

export interface SearchResult {
  title: string
  url: string
  snippet?: string
  domain?: string
  rank: number
}

// Message types between extension components
export type MessageType =
  | 'EXTRACT_PAGE'
  | 'PAGE_EXTRACTED'
  | 'OPEN_SIDEPANEL'
  | 'CAPTURE_COMPLETE'
  | 'PING'

export interface ExtensionMessage {
  type: MessageType
  payload?: unknown
}

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Verified',
  'Contacted',
  'Follow-up Required',
  'Meeting Booked',
  'Proposal Sent',
  'Won',
  'Lost',
  'Not Relevant',
]

export const TEAM_MEMBERS = [
  'Caller / Meeting Coordinator',
  'UK BD',
  'PM / Technical Closer',
  'Unassigned',
]

export const NEXT_ACTIONS = ['Call', 'Email', 'LinkedIn Message', 'Visit', 'Follow up', 'No Action']
