import type { Lead } from '../types/lead'
import type { AppSettings } from '../types/settings'

export type FlowCrmLeadPayload = {
  leadId: string
  businessName?: string
  email?: string | null
  primaryEmail?: string | null
  phone?: string | null
  primaryPhone?: string | null
  website?: string
  domain?: string
  city?: string
  country?: string
  address?: string
  industry?: string
  leadScore?: number
  leadPriority?: string
  leadStatus?: string
  brandFit?: string
  serviceFit?: string[]
  googleRating?: number
  googleReviews?: number
  hasChatWidget?: boolean
  chatWidgetProvider?: string
  technologyDetected?: string[]
  sourceType?: string
  ownerName?: string
  ownerMobile?: string
  ownerPhone?: string
  ownerWorkEmail?: string
  decisionMakerLinkedin?: string
  ownerLinkedin?: string
  linkedinUrl?: string
  businessLinkedin?: string
  gmbPhone?: string
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  youtubeUrl?: string
  xTwitterUrl?: string
  whatsappUrl?: string
  notes?: string
  targetMarket?: string
  b2bSource?: string
  mobileSource?: string
  companiesHouseMatched?: boolean
}

export type FlowCrmSyncResult = {
  created: number
  updated: number
  skipped: number
  failed: number
  results: {
    leadId: string | null
    contactId: string
    created: boolean
    error?: string
  }[]
}

export function isQualifiedLead(lead: Lead): boolean {
  return lead.leadPriority === 'Hot' || lead.leadPriority === 'Warm'
}

export function leadToCrmPayload(lead: Lead): FlowCrmLeadPayload {
  const businessPhone = lead.phone || lead.gmbPhone || lead.allPhones?.[0]
  return {
    leadId: lead.leadId,
    businessName: lead.businessName,
    email: lead.email || lead.primaryEmail || lead.ownerWorkEmail || null,
    primaryEmail: lead.primaryEmail || lead.email || null,
    phone: businessPhone || null,
    primaryPhone: businessPhone || null,
    website: lead.website || lead.gmbWebsite,
    domain: lead.domain,
    city: lead.city,
    country: lead.country,
    address: lead.address || lead.gmbAddress,
    industry: lead.industry || lead.category,
    leadScore: lead.leadScore,
    leadPriority: lead.leadPriority,
    leadStatus: lead.leadStatus,
    brandFit: lead.brandFit,
    serviceFit: lead.serviceFit,
    googleRating: lead.googleRating ?? lead.gmbRating,
    googleReviews: lead.googleReviews ?? lead.gmbReviews,
    hasChatWidget: lead.hasChatWidget,
    chatWidgetProvider: lead.chatWidgetProvider,
    technologyDetected: lead.technologyDetected,
    sourceType: lead.sourceType,
    ownerName: lead.ownerName || lead.directorName,
    ownerMobile: lead.ownerMobile,
    ownerPhone: lead.ownerPhone,
    ownerWorkEmail: lead.ownerWorkEmail,
    decisionMakerLinkedin: lead.decisionMakerLinkedin,
    ownerLinkedin: lead.decisionMakerLinkedin,
    linkedinUrl: lead.linkedinUrl,
    businessLinkedin: lead.linkedinUrl,
    gmbPhone: lead.gmbPhone,
    facebookUrl: lead.facebookUrl,
    instagramUrl: lead.instagramUrl,
    tiktokUrl: lead.tiktokUrl,
    youtubeUrl: lead.youtubeUrl,
    xTwitterUrl: lead.xTwitterUrl,
    whatsappUrl: lead.whatsappUrl,
    notes: lead.notes,
    targetMarket: lead.targetMarket,
    b2bSource: lead.b2bSource,
    mobileSource: lead.mobileSource,
    companiesHouseMatched: lead.companiesHouseMatched,
  }
}

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function syncEndpoint(baseUrl: string): string {
  const base = normalizeApiBase(baseUrl)
  if (base.endsWith('/integrations/v1/leadsnapper/leads')) return base
  return `${base}/integrations/v1/leadsnapper/leads`
}

const BATCH_SIZE = 50

export async function syncLeadsToFlowCrm(
  settings: AppSettings,
  leads: Lead[]
): Promise<FlowCrmSyncResult> {
  const apiUrl = settings.flowCrmApiUrl?.trim()
  const apiKey = settings.flowCrmApiKey?.trim()
  if (!apiUrl || !apiKey) {
    throw new Error('Configure Flow CRM API URL and key in Settings')
  }
  if (!settings.flowCrmSyncEnabled) {
    throw new Error('Enable Flow CRM sync in Settings')
  }
  if (leads.length === 0) {
    throw new Error('No leads to sync')
  }

  const endpoint = syncEndpoint(apiUrl)
  const aggregate: FlowCrmSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    results: [],
  }

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        source: 'leadsnapper',
        leads: batch.map(leadToCrmPayload),
      }),
    })

    const body = (await res.json().catch(() => ({}))) as FlowCrmSyncResult & { error?: string }
    if (!res.ok) {
      throw new Error(body.error || `CRM sync failed (${res.status})`)
    }

    aggregate.created += body.created ?? 0
    aggregate.updated += body.updated ?? 0
    aggregate.skipped += body.skipped ?? 0
    aggregate.failed += body.failed ?? 0
    if (body.results?.length) aggregate.results.push(...body.results)
  }

  return aggregate
}
