import type { ExtractedPageData } from '../types/lead'
import type { ScanLead, EnrichedData } from '../types/scan'
import { scoreScanLead } from '../types/scan'
import { enqueueEnrichment } from './enricher'
import type { AppSettings } from '../types/settings'
import { loadSettings, mergeSettings } from '../utils/storage'
import { applyBuiltinApiKeys, chApiKey, chLiveModeActive, mergeEnrichSettings, resolveChSettings } from '../utils/companiesHouse'
import { parseDirectorName, parseOpenmartTaskResult, type OpenmartPerson } from '../utils/openmart'
import { leadStableKey } from '../utils/leadKey'

// ── Port + tab tracking ───────────────────────────────────────────────────────

const openTabs = new Set<number>()
let sidepanelPort: chrome.runtime.Port | null = null

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'sidepanel') return
  sidepanelPort = port

  // Track tab only — no auto-scan (user clicks Scan / Load more in side panel)
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) openTabs.add(tab.id)
  })

  port.onDisconnect.addListener(() => {
    sidepanelPort = null
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) openTabs.delete(tab.id)
    })
  })
})

// ── Toggle panel on icon click ────────────────────────────────────────────────

chrome.action.onClicked.addListener(async tab => {
  const tabId = tab.id
  if (!tabId) return
  if (openTabs.has(tabId)) {
    try {
      await chrome.sidePanel.setOptions({ tabId, enabled: false })
      openTabs.delete(tabId)
      await chrome.sidePanel.setOptions({ tabId, enabled: true })
    } catch {
      await chrome.sidePanel.open({ tabId }).catch(() => {})
    }
  } else {
    await chrome.sidePanel.open({ tabId }).catch(() => {})
  }
})

// ── Messages ──────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  // Manual scan trigger from side panel
  if (msg.type === 'SCAN_PAGE') {
    scanActiveTab().then(result => {
      const payload = result ?? { leads: [], pageType: 'unknown', filteredCount: 0 }
      sidepanelPort?.postMessage({ type: 'SCAN_RESULTS', payload })
      if (payload.leads.length > 0) {
        startEnrichment(payload.leads as ScanLead[])
      }
      sendResponse({ ok: true })
    })
    return true
  }

  // Single-page extraction (website / LinkedIn)
  if (msg.type === 'EXTRACT_PAGE') {
    extractActiveTab().then(data => {
      sidepanelPort?.postMessage({ type: 'PAGE_EXTRACTED', payload: data })
      if (data) {
        chrome.storage.session.set({ pendingCapture: { data, ts: Date.now() } }).catch(() => {})
      }
      sendResponse({ ok: !!data, data })
    })
    return true
  }

  // Manual re-enrich a single lead (plugin-based)
  if (msg.type === 'ENRICH_LEAD') {
    const lead = msg.payload as ScanLead
    enrichCompleted.delete(leadStableKey(lead))
    enrichInFlight.delete(leadStableKey(lead))
    enqueueEnrichment(lead, (id, data, error) => {
      if (data) {
        const updatedLead = { ...lead, enriched: data }
        const { score, priority } = scoreScanLead(updatedLead as ScanLead)
        sidepanelPort?.postMessage({ type: 'ENRICH_RESULT', payload: { id, data, score, priority } })
      } else {
        sidepanelPort?.postMessage({ type: 'ENRICH_RESULT', payload: { id, data: null, error } })
      }
    })
    sendResponse({ ok: true })
    return true
  }

  // Enrich a session lead by URL (website or LinkedIn)
  if (msg.type === 'ENRICH_SESSION_LEAD') {
    const { leadId, url } = msg.payload as { leadId: string; url: string }
    const fakeLead = { id: leadId, websiteUrl: url, sourceUrl: url, enrichStatus: 'pending' } as ScanLead
    enqueueEnrichment(fakeLead, (id, data, error) => {
      sidepanelPort?.postMessage({ type: 'SESSION_ENRICH_RESULT', payload: { leadId: id, data, error } })
    })
    sendResponse({ ok: true })
    return true
  }

  // Paid B2B enrichment APIs removed — scrape-only product.
  if (msg.type === 'EXPLORIUM_ENRICH') {
    const { leadId } = msg.payload as { leadId: string }
    sidepanelPort?.postMessage({
      type: 'EXPLORIUM_RESULT',
      payload: {
        leadId,
        error: 'Enrichment APIs removed. Use Scan / Capture on public pages only.',
      },
    })
    sendResponse({ ok: false, error: 'enrichment_disabled' })
    return false
  }

  if (false && msg.type === '__LEADS_NAPPER_ENRICHMENT_DISABLED__') {
    // Keep TypeScript from tree-shaking large helpers still referenced below in this file.
    void msg
  }

  // legacy block intentionally bypassed — original EXPLORIUM_ENRICH handler removed from runtime path
  if (msg.type === 'EXPLORIUM_ENRICH_LEGACY_DISABLED') {
    const { leadId, businessName, domain, provider, ownerLinkedinUrl, ownerName, businessPhone, address, city, country, settings: settingsFromPanel } = msg.payload as {
      leadId: string; businessName: string; domain: string
      provider: import('../types/settings').EnrichmentProvider
      ownerLinkedinUrl?: string; ownerName?: string; businessPhone?: string
      address?: string; city?: string; country?: string
      settings?: Partial<AppSettings>
    }
    ;(async () => {
      const stored = resolveChSettings(applyBuiltinApiKeys(await loadSettings()))
      const settings = settingsFromPanel
        ? mergeEnrichSettings(stored, mergeSettings(settingsFromPanel))
        : stored
      const expKey   = settings?.exploriumApiKey ?? ''
      const pdlKey   = settings?.pdlApiKey       ?? ''

      try {
        let data: ExploriumResult
        const effectiveProvider = settings?.localSmbMode ? 'waterfall' : provider

        if (effectiveProvider === 'explorium') {
          if (!settings?.exploriumEnabled) throw new Error('Explorium is disabled. Enable it in Settings → B2B Enrichment APIs.')
          if (!expKey) throw new Error('No Explorium API key. Add it in Settings → API Keys.')
          data = { ...await enrichWithExplorium(businessName, domain, expKey), source: 'Explorium' }

        } else if (effectiveProvider === 'pdl') {
          if (!settings?.pdlEnabled) throw new Error('People Data Labs is disabled. Enable it in Settings → B2B Enrichment APIs.')
          if (!pdlKey) throw new Error('No People Data Labs API key. Add it in Settings → API Keys.')
          data = { ...await enrichWithPDL(businessName, domain, pdlKey, ownerLinkedinUrl, ownerName), source: 'People Data Labs' }

        } else if (effectiveProvider === 'waterfall') {
          if (!settings) throw new Error('Settings not loaded.')
          data = await enrichWithWaterfall(businessName, domain, settings, ownerLinkedinUrl, ownerName, businessPhone, country, city, address)

        } else {
          // Both — run in parallel, merge best data
          const results = await Promise.allSettled([
            expKey ? enrichWithExplorium(businessName, domain, expKey) : Promise.reject('no key'),
            pdlKey ? enrichWithPDL(businessName, domain, pdlKey, ownerLinkedinUrl, ownerName) : Promise.reject('no key'),
          ])
          const exp = results[0].status === 'fulfilled' ? results[0].value : null
          const pdl = results[1].status === 'fulfilled' ? results[1].value : null
          if (!exp && !pdl) throw new Error('Both APIs failed or no keys configured. Check Settings → API Keys.')
          data = {
            ownerName:          exp?.ownerName          || pdl?.ownerName,
            ownerTitle:         exp?.ownerTitle         || pdl?.ownerTitle,
            ownerEmail:         exp?.ownerEmail         || pdl?.ownerEmail,
            ownerPersonalEmail: exp?.ownerPersonalEmail || pdl?.ownerPersonalEmail,
            ownerPhone:         exp?.ownerPhone         || pdl?.ownerPhone,
            ownerMobile:        exp?.ownerMobile        || pdl?.ownerMobile,
            ownerLinkedin:      exp?.ownerLinkedin      || pdl?.ownerLinkedin,
            businessId:         exp?.businessId         || pdl?.businessId,
            prospectId:         exp?.prospectId         || pdl?.prospectId,
            enrichedAt:         new Date().toISOString(),
            source:             exp && pdl ? 'Explorium + PDL' : exp ? 'Explorium' : 'People Data Labs',
          }
        }

        sidepanelPort?.postMessage({ type: 'EXPLORIUM_RESULT', payload: { leadId, data } })
      } catch (err) {
        const error = err instanceof Error && err.message === 'MISSING_CH_KEY'
          ? 'MISSING_CH_KEY'
          : String(err)
        sidepanelPort?.postMessage({ type: 'EXPLORIUM_RESULT', payload: { leadId, error } })
      }
    })()
    sendResponse({ ok: true })
    return true
  }

  // Badge update
  if (msg.type === 'UPDATE_BADGE') {
    const count = (msg.payload as { count: number }).count
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
    chrome.action.setBadgeBackgroundColor({ color: '#1F4E79' })
    sendResponse({ ok: true })
    return true
  }
})

// ── Enrichment ────────────────────────────────────────────────────────────────

/** Prevent re-enriching the same business on Load more / re-scan */
const enrichCompleted = new Set<string>()
const enrichInFlight    = new Set<string>()

function startEnrichment(leads: ScanLead[]) {
  const enrichable = leads.filter(l => {
    const key = leadStableKey(l)
    if (enrichCompleted.has(key) || enrichInFlight.has(key)) return false
    const hasTarget = !!(
      l.googleMapsUrl ||
      l.websiteUrl ||
      l.sourceUrl?.includes('/maps/place/') ||
      (l.sourceType === 'Google Maps')
    )
    return hasTarget
  })

  for (const lead of enrichable) {
    const key = leadStableKey(lead)
    enrichInFlight.add(key)
    // Immediately notify side panel that this lead is being enriched
    sidepanelPort?.postMessage({
      type: 'ENRICH_STATUS',
      payload: { id: lead.id, status: 'enriching' },
    })

    enqueueEnrichment(lead, (id: string, data: EnrichedData | null, error?: string) => {
      enrichInFlight.delete(key)
      if (data) {
        enrichCompleted.add(key)
        const updatedLead = { ...lead, enriched: data }
        const { score, priority } = scoreScanLead(updatedLead as ScanLead)
        sidepanelPort?.postMessage({
          type: 'ENRICH_RESULT',
          payload: { id, data, score, priority, error: undefined },
        })
      } else {
        sidepanelPort?.postMessage({
          type: 'ENRICH_RESULT',
          payload: { id, data: null, error: error ?? 'Failed' },
        })
      }
    })
  }
}

// ── Tab helpers ───────────────────────────────────────────────────────────────

async function injectContentScript(tabId: number): Promise<void> {
  const mf = await (await fetch(chrome.runtime.getURL('manifest.json'))).json() as chrome.runtime.Manifest
  const files = mf.content_scripts?.flatMap(cs => cs.js ?? []) ?? []
  if (!files.length) return
  await chrome.scripting.executeScript({ target: { tabId }, files })
  await new Promise(r => setTimeout(r, 600))
}

async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return { leads: [], pageType: 'unknown', filteredCount: 0 }
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }) as {
      leads: Partial<ScanLead>[]
      pageType: string
      filteredCount: number
    }
  } catch {
    try {
      await injectContentScript(tab.id)
      return await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }) as {
        leads: Partial<ScanLead>[]
        pageType: string
        filteredCount: number
      }
    } catch {
      return { leads: [], pageType: 'error', filteredCount: 0 }
    }
  }
}

// ── Explorium B2B enrichment ──────────────────────────────────────────────────

interface ExploriumResult {
  ownerName?:          string
  ownerTitle?:         string
  ownerEmail?:         string
  ownerPersonalEmail?: string
  ownerPhone?:         string
  ownerMobile?:        string
  ownerLinkedin?:      string
  businessId?:         string
  prospectId?:         string
  enrichedAt?:         string
  source?:             string
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
  openmartPeople?:                OpenmartPerson[]
  mobileSource?:                  string
}

async function enrichWithExplorium(
  businessName: string,
  domain: string,
  apiKey: string
): Promise<ExploriumResult> {
  const hdrs = { 'api_key': apiKey, 'Content-Type': 'application/json' }
  const BASE  = 'https://api.explorium.ai/v1'

  // Step 1 — match business to get business_id
  const matchRes  = await fetch(`${BASE}/businesses/match`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ businesses_to_match: [{ name: businessName, domain }] }),
  })
  if (!matchRes.ok) throw new Error(`Explorium business match: ${matchRes.status} ${matchRes.statusText}`)
  const matchJson = await matchRes.json()
  const businessId = matchJson.matched_businesses?.[0]?.business_id as string | undefined
  if (!businessId) throw new Error(`Business "${businessName}" not found in Explorium (domain: ${domain})`)

  // Step 2 — fetch decision-makers at this business (owner / CXO / director / founder)
  const prospRes  = await fetch(`${BASE}/prospects`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({
      mode: 'full',
      page_size: 5,
      filters: {
        business_id: { values: [businessId] },
        job_level:   { values: ['owner', 'founder', 'cxo', 'c-suite', 'director', 'president', 'partner', 'vp', 'board member'] },
      },
    }),
  })
  if (!prospRes.ok) throw new Error(`Explorium prospects: ${prospRes.status} ${prospRes.statusText}`)
  const prospJson = await prospRes.json()
  const prospect  = prospJson.data?.[0] as Record<string, unknown> | undefined
  if (!prospect) throw new Error('No owner / decision-maker found for this business in Explorium')

  const prospectId = prospect.prospect_id as string
  const fullName   = (prospect.full_name as string)
    || `${prospect.first_name ?? ''} ${prospect.last_name ?? ''}`.trim()
  const title      = (prospect.job_title ?? prospect.job_level_main ?? '') as string
  const linkedin   = ((prospect.linkedin_url_array as string[] | undefined)?.[0]) ?? ''

  // Step 3 — enrich with verified email + phone
  const enrichRes  = await fetch(`${BASE}/prospects/contacts_information/enrich`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ prospect_id: prospectId, parameters: { contact_types: ['email', 'phone'] } }),
  })
  if (!enrichRes.ok) throw new Error(`Explorium contact enrich: ${enrichRes.status} ${enrichRes.statusText}`)
  const enrichJson = await enrichRes.json()

  const email = (enrichJson.professions_email as string | undefined)
    || (enrichJson.emails as Array<{value?: string}> | undefined)?.[0]?.value
    || ''
  const phone = (enrichJson.mobile_phone as string | undefined)
    || (enrichJson.phone_numbers as Array<{value?: string}> | undefined)?.[0]?.value
    || ''

  return {
    ownerName:     fullName    || undefined,
    ownerTitle:    title       || undefined,
    ownerEmail:    email       || undefined,
    ownerPhone:    phone       || undefined,
    ownerLinkedin: linkedin    || undefined,
    businessId,
    prospectId,
    enrichedAt: new Date().toISOString(),
  }
}

// ── People Data Labs enrichment ───────────────────────────────────────────────

async function enrichWithPDL(
  businessName: string,
  domain: string,
  apiKey: string,
  ownerLinkedinUrl?: string,
  ownerName?: string,
): Promise<ExploriumResult> {
  const BASE = 'https://api.peopledatalabs.com/v5'
  const hdrs = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }

  // ── Strategy 1: Person Enrichment — when we already know who the person is ──
  // More accurate: directly targets a specific individual
  if (ownerLinkedinUrl || ownerName) {
    const body: Record<string, unknown> = { titlecase: true, min_likelihood: 2 }
    if (ownerLinkedinUrl) body.profile = [ownerLinkedinUrl]
    if (ownerName)        body.name    = ownerName
    if (domain)           body.company = domain

    const enrichRes = await fetch(`${BASE}/person/enrich`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(body),
    })

    if (enrichRes.ok) {
      const enrichJson = await enrichRes.json() as { status: number; likelihood?: number; data?: Record<string, unknown> }
      if (enrichJson.data) {
        return parsePdlPerson(enrichJson.data)
      }
    }
    // Non-200 or no data — fall through to Search
  }

  // ── Strategy 2: Person Search — find decision-makers by company domain ──
  const safeDomain = domain.replace(/'/g, "''")
  const safeName   = businessName.replace(/'/g, "''")
  const baseWhere  = `job_title_levels IN ('owner','c_suite','director','vp','partner')`
  const companyFilter = domain
    ? `(job_company_website='${safeDomain}' OR job_company_name='${safeName}')`
    : `job_company_name='${safeName}'`

  async function pdlSearch(sql: string): Promise<Record<string, unknown>[] | null> {
    const r = await fetch(`${BASE}/person/search`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ sql, size: 5, dataset: 'all', titlecase: true }),
    })
    if (r.status === 404) return null   // PDL returns 404 for "no results"
    if (!r.ok) {
      let detail = r.statusText
      try {
        const body = await r.json() as { error?: { message?: string }; message?: string }
        detail = body?.error?.message ?? body?.message ?? detail
      } catch { /* non-JSON */ }
      throw new Error(`PDL person search: ${r.status} — ${detail}`)
    }
    const json = await r.json() as { data?: Record<string, unknown>[] }
    return json.data?.length ? json.data : null
  }

  // Pass 1: require mobile_phone so we get a direct personal number
  let results = await pdlSearch(
    `SELECT * FROM person WHERE ${companyFilter} AND ${baseWhere} AND mobile_phone IS NOT NULL`
  )
  // Pass 2: drop mobile requirement — take any match, pick best result with mobile in parsePdlPerson
  if (!results) {
    results = await pdlSearch(`SELECT * FROM person WHERE ${companyFilter} AND ${baseWhere}`)
  }
  // Pass 3: name-only fallback when domain lookup found nothing
  if (!results) {
    results = await pdlSearch(`SELECT * FROM person WHERE job_company_name='${safeName}' AND ${baseWhere}`)
  }

  if (!results) throw new Error(`No decision-makers found for "${businessName}" in People Data Labs`)

  // Prefer the result that has a mobile_phone
  const best = results.find(r => r.mobile_phone) ?? results[0]
  return parsePdlPerson(best)
}

function parsePdlPerson(p: Record<string, unknown>): ExploriumResult {
  const fullName = (p.full_name as string | undefined)
    || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()

  // Separate work vs personal emails
  const emails = Array.isArray(p.emails) ? (p.emails as Array<{ address?: string; type?: string }>) : []
  const workEmail     = emails.find(e => e.type === 'current_professional' || e.type === 'professional')?.address
  const personalEmail = emails.find(e => e.type === 'personal')?.address
  const anyEmail      = emails[0]?.address

  // mobile_phone = personal direct number (separate PDL dataset)
  // phone_numbers = may duplicate the business landline we already have from Maps
  const mobile = (p.mobile_phone as string | undefined)
  const phones = Array.isArray(p.phone_numbers) ? (p.phone_numbers as string[]) : []
  const altPhone = phones.find(ph => ph !== mobile) ?? undefined

  return {
    ownerName:          fullName                               || undefined,
    ownerTitle:         (p.job_title as string | undefined)    || undefined,
    ownerEmail:         workEmail     || anyEmail              || undefined,
    ownerPersonalEmail: personalEmail                          || undefined,
    ownerMobile:        mobile                                 || undefined,
    ownerPhone:         altPhone                               || undefined,
    ownerLinkedin:      (p.linkedin_url as string | undefined) || undefined,
    businessId:         (p.job_company_id as string | undefined) || undefined,
    prospectId:         (p.id as string | undefined)           || undefined,
    enrichedAt:         new Date().toISOString(),
  }
}

// ── Waterfall: 3-step owner mobile lookup ─────────────────────────────────────

function dedupePhone(phone: string | undefined, businessPhone: string | undefined): string | undefined {
  if (!phone) return undefined
  if (!businessPhone) return phone
  const norm = (p: string) => p.replace(/[\s\-().+]/g, '')
  return norm(phone) === norm(businessPhone) ? undefined : phone
}

function detectMarket(country?: string): 'UK' | 'US' | 'unknown' {
  if (!country) return 'unknown'
  const c = country.toLowerCase()
  if (c.includes('united kingdom') || c === 'uk' || c.includes('england') || c.includes('scotland') || c.includes('wales')) return 'UK'
  if (c.includes('united states') || c === 'usa' || c === 'us') return 'US'
  return 'unknown'
}

async function enrichCompaniesHouseOnly(
  businessName: string,
  _domain: string,
  settings: AppSettings,
): Promise<ExploriumResult> {
  const chSettings = resolveChSettings(settings)
  if (!chApiKey(chSettings)) {
    throw new Error('MISSING_CH_KEY')
  }
  assertCompaniesHouseConfig(chSettings)

  const ch = await lookupCompaniesHouse(businessName, chSettings)
  if (!ch?.companyNumber) {
    throw new Error(
      `No UK company on Companies House for "${businessName}". Try the exact registered Ltd name.`,
    )
  }
  return mapChToExplorium(ch)
}

function waterfallSource(steps: string[]): string {
  return steps.filter(Boolean).join(' → ')
}

function mergeOpenmartInto(partial: ExploriumResult, om: ExploriumResult): ExploriumResult {
  return {
    ...partial,
    ownerName: om.ownerName || partial.ownerName,
    ownerTitle: om.ownerTitle || partial.ownerTitle,
    ownerEmail: om.ownerEmail || partial.ownerEmail,
    ownerMobile: om.ownerMobile || partial.ownerMobile,
    ownerLinkedin: om.ownerLinkedin || partial.ownerLinkedin,
    openmartPeople: om.openmartPeople,
    enrichedAt: om.enrichedAt || partial.enrichedAt,
  }
}

async function enrichWithWaterfall(
  businessName: string,
  domain: string,
  settings: AppSettings,
  ownerLinkedinUrl?: string,
  ownerName?: string,
  businessPhone?: string,
  country?: string,
  city?: string,
  address?: string,
): Promise<ExploriumResult> {
  if (settings.companiesHouseOnlyTest) {
    return enrichCompaniesHouseOnly(businessName, domain, settings)
  }

  const market = detectMarket(country)
  if (market === 'US') {
    return enrichUsWaterfall(businessName, domain, settings, ownerName, businessPhone, city, address, country)
  }
  return enrichUkWaterfall(businessName, domain, settings, ownerName, businessPhone, city, address, country)
}

/** UK: Companies House → Openmart (CH name/details) → Cognism (mobile fallback). */
async function enrichUkWaterfall(
  businessName: string,
  domain: string,
  settings: AppSettings,
  ownerName?: string,
  businessPhone?: string,
  city?: string,
  address?: string,
  country?: string,
): Promise<ExploriumResult> {
  let partial: ExploriumResult = {}
  const steps: string[] = []
  const stepErrors: string[] = []

  // Step 1 — Companies House register (company, director, PSC, address)
  if (settings.localSmbMode && chLiveModeActive(settings)) {
    const chSettings = resolveChSettings(settings)
    if (!chApiKey(chSettings)) {
      stepErrors.push('Companies House: API key missing — add in Settings')
    } else {
      try {
        const ch = await lookupCompaniesHouse(businessName, chSettings)
        if (ch?.companyNumber) {
          partial = { ...mapChToExplorium(ch) }
          steps.push('Companies House')
        } else {
          stepErrors.push(`Companies House: no UK company match for "${businessName}"`)
        }
      } catch (err) {
        stepErrors.push(`Companies House: ${String(err)}`)
      }
    }
  }

  const chCompany = partial.companiesHouseCompanyName || businessName
  const chAddress = partial.companiesHouseRegisteredAddress || address
  const directorRaw = partial.companiesHouseDirectorName || partial.ownerName
  const { first: dirFirst, last: dirLast } = parseDirectorName(directorRaw ?? '')

  // Step 2 — Openmart find_people using CH register name + director
  if (settings.openmartApiKey && settings.openmartEnabled) {
    try {
      const om = await enrichWithOpenmart(businessName, domain, settings.openmartApiKey, {
        city,
        address: chAddress,
        country: country || 'GB',
        companyName: chCompany,
        ownerFirstName: dirFirst,
        ownerLastName: dirLast,
      })
      partial = mergeOpenmartInto(partial, om)
      steps.push('Openmart')
      const mobile = dedupePhone(om.ownerMobile, businessPhone)
      if (mobile) {
        return {
          ...partial,
          ownerMobile: mobile,
          ownerPhone: undefined,
          mobileSource: 'Openmart',
          source: waterfallSource(steps),
          enrichedAt: new Date().toISOString(),
        }
      }
    } catch (err) {
      stepErrors.push(`Openmart: ${String(err)}`)
    }
  }

  // Step 3 — Cognism when Openmart has no mobile
  const ukName = partial.ownerName ?? ownerName ?? directorRaw
  const hasMobile = !!dedupePhone(partial.ownerMobile, businessPhone)
  if (!hasMobile && ukName && settings.cognismApiKey && settings.cognismEnabled) {
    const { first, last } = parseDirectorName(ukName)
    const firstName = first || ukName.split(/\s+/)[0] || ''
    const lastName = last || ukName.split(/\s+/).slice(1).join(' ')
    try {
      const r = await enrichWithCognism(firstName, lastName, chCompany, domain, settings.cognismApiKey)
      const mobile = dedupePhone(r.ownerMobile, businessPhone)
      if (mobile) {
        steps.push('Cognism')
        return {
          ...partial,
          ...r,
          ownerName: ukName,
          ownerMobile: mobile,
          mobileSource: 'Cognism',
          source: waterfallSource(steps),
          enrichedAt: new Date().toISOString(),
        }
      }
      if (r.ownerEmail) partial = { ...partial, ownerEmail: r.ownerEmail }
    } catch (err) {
      stepErrors.push(`Cognism: ${String(err)}`)
    }
  } else if (!hasMobile && ukName && settings.cognismEnabled && !settings.cognismApiKey) {
    stepErrors.push('Cognism: API key missing')
  }

  return finishWaterfall(partial, steps, stepErrors, businessName, settings, 'UK')
}

/** US: Openmart (business details) → Lusha (owner mobile fallback). */
async function enrichUsWaterfall(
  businessName: string,
  domain: string,
  settings: AppSettings,
  ownerName?: string,
  businessPhone?: string,
  city?: string,
  address?: string,
  country?: string,
): Promise<ExploriumResult> {
  let partial: ExploriumResult = {}
  const steps: string[] = []
  const stepErrors: string[] = []

  // Step 1 — Openmart
  if (settings.openmartApiKey && settings.openmartEnabled) {
    try {
      const om = await enrichWithOpenmart(businessName, domain, settings.openmartApiKey, {
        city,
        address,
        country: country || 'US',
      })
      partial = mergeOpenmartInto(partial, om)
      steps.push('Openmart')
      const mobile = dedupePhone(om.ownerMobile, businessPhone)
      if (om.ownerName && mobile) {
        return {
          ...partial,
          ownerMobile: mobile,
          ownerPhone: undefined,
          mobileSource: 'Openmart',
          source: waterfallSource(steps),
          enrichedAt: new Date().toISOString(),
        }
      }
    } catch (err) {
      stepErrors.push(`Openmart: ${String(err)}`)
    }
  }

  // Step 2 — Lusha when owner known but no mobile
  const usName = partial.ownerName ?? ownerName
  const hasMobile = !!dedupePhone(partial.ownerMobile, businessPhone)
  if (!hasMobile && settings.lushaApiKey && settings.lushaEnabled) {
    const { first, last } = parseDirectorName(usName ?? '')
    const firstName = first || usName?.split(/\s+/)[0] || ''
    const lastName = last || usName?.split(/\s+/).slice(1).join(' ') || ''
    try {
      const r = await enrichWithLusha(firstName, lastName, domain, settings.lushaApiKey)
      const mobile = dedupePhone(r.ownerMobile, businessPhone)
      if (mobile) {
        steps.push('Lusha')
        return {
          ...partial,
          ...r,
          ownerName: usName || partial.ownerName,
          ownerMobile: mobile,
          mobileSource: 'Lusha',
          source: waterfallSource(steps),
          enrichedAt: new Date().toISOString(),
        }
      }
      if (r.ownerEmail) partial = { ...partial, ownerEmail: r.ownerEmail }
    } catch (err) {
      stepErrors.push(`Lusha: ${String(err)}`)
    }
  }

  return finishWaterfall(partial, steps, stepErrors, businessName, settings, 'US')
}

function finishWaterfall(
  partial: ExploriumResult,
  steps: string[],
  stepErrors: string[],
  businessName: string,
  settings: AppSettings,
  market: 'UK' | 'US',
): ExploriumResult {
  const anyActive = (settings.openmartApiKey && settings.openmartEnabled)
    || (settings.cognismApiKey && settings.cognismEnabled)
    || (settings.lushaApiKey && settings.lushaEnabled)
    || (chLiveModeActive(settings) && chApiKey(resolveChSettings(settings)))
  if (!anyActive) {
    throw new Error('All waterfall providers are disabled or have no key. Enable at least one in Settings → Local SMB API Keys.')
  }

  if (partial.ownerName || (partial.openmartPeople?.length ?? 0) > 0 || partial.companiesHouseMatched) {
    const suffix = partial.ownerMobile ? '' : ' (register/contact found — no personal mobile)'
    return {
      ...partial,
      source: steps.length ? `${waterfallSource(steps)}${suffix}` : `Partial match${suffix}`,
      enrichedAt: new Date().toISOString(),
    }
  }

  const hint = stepErrors.length ? `\n${stepErrors.join('\n')}` : ''
  const flow = market === 'UK'
    ? 'UK: Companies House → Openmart → Cognism'
    : 'US: Openmart → Lusha'
  throw new Error(`No owner data for "${businessName}". Expected flow: ${flow}.${hint}`)
}

// ── Step 1: Openmart ──────────────────────────────────────────────────────────

interface OpenmartBatchStatusBody {
  batch_ready?: boolean
  processing?: number
  completed?: number
  errored?: number
  total?: number
  status?: {
    batch_ready?: boolean
    processing?: number
    completed?: number
    errored?: number
    total?: number
  }
}

/** Submit response nests status; poll response puts batch_ready at top level (Openmart docs). */
function openmartBatchReady(body: OpenmartBatchStatusBody): boolean {
  if (typeof body.batch_ready === 'boolean') return body.batch_ready
  if (typeof body.status?.batch_ready === 'boolean') return body.status.batch_ready
  const processing = body.processing ?? body.status?.processing
  const completed  = body.completed  ?? body.status?.completed
  const errored    = body.errored    ?? body.status?.errored
  if (typeof processing === 'number' && processing === 0 && (completed ?? 0) > 0) return true
  if (typeof errored === 'number' && errored > 0 && (completed ?? 0) === 0) return true
  return false
}

function openmartBatchFailed(body: OpenmartBatchStatusBody): boolean {
  const errored = body.errored ?? body.status?.errored ?? 0
  const completed = body.completed ?? body.status?.completed ?? 0
  const processing = body.processing ?? body.status?.processing ?? 0
  return errored > 0 && completed === 0 && processing === 0
}

function normalizeOpenmartDomain(domain: string): string | undefined {
  if (!domain) return undefined
  const d = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]?.trim()
  if (!d || /^(facebook|instagram|tiktok|yelp|tripadvisor)\./i.test(d)) return undefined
  return d
}

function openmartCountryHint(country?: string): string | undefined {
  if (!country) return undefined
  const c = country.toLowerCase()
  if (c.includes('united kingdom') || c === 'uk' || c.includes('england')) return 'GB'
  if (c.includes('united states') || c === 'usa' || c === 'us') return 'US'
  return country.length <= 3 ? country.toUpperCase() : country
}

async function parseOpenmartTaskIds(res: Response): Promise<string[]> {
  const json = await res.json() as string[] | { task_ids?: string[] }
  if (Array.isArray(json)) return json
  return json.task_ids ?? []
}

interface OpenmartLookupOptions {
  city?: string
  address?: string
  country?: string
  companyName?: string
  ownerFirstName?: string
  ownerLastName?: string
  title?: string
}

async function enrichWithOpenmart(
  businessName: string,
  domain: string,
  apiKey: string,
  options: OpenmartLookupOptions = {},
): Promise<ExploriumResult> {
  const BASE = 'https://api.openmart.ai'
  const hdrs = { 'X-API-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' }

  const cleanDomain = normalizeOpenmartDomain(domain)
  const payload: Record<string, unknown> = {
    company_name: options.companyName || businessName,
    title: options.title || 'Owner',
    max_k: 5,
    info_access: ['EMAIL', 'PHONE'],
  }
  if (cleanDomain) payload.domain = cleanDomain
  if (options.city) payload.city = options.city
  if (options.address) payload.address = options.address
  if (options.ownerFirstName) payload.first_name = options.ownerFirstName
  if (options.ownerLastName) payload.last_name = options.ownerLastName
  const countryHint = openmartCountryHint(options.country)
  if (countryHint) payload.country = countryHint

  // Submission can take 30+ s (Openmart docs); allow up to 90 s
  const submitRes = await fetch(`${BASE}/api/v1/task/batch/find_people`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify([payload]),
    signal: AbortSignal.timeout(90_000),
  })
  const submitJson = await submitRes.json() as {
    batch_id?: string
    detail?: string | Array<{ msg?: string }>
    message?: string
  }
  if (!submitRes.ok) {
    const detail = typeof submitJson.detail === 'string'
      ? submitJson.detail
      : Array.isArray(submitJson.detail) ? submitJson.detail[0]?.msg : submitJson.message
    throw new Error(`Openmart submit: ${submitRes.status}${detail ? ` — ${detail}` : ''}`)
  }
  const batch_id = submitJson.batch_id
  if (!batch_id) throw new Error('Openmart submit: response missing batch_id')

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000))

    const statusRes = await fetch(`${BASE}/api/v1/task/batch/${batch_id}/status`, { headers: hdrs })
    if (!statusRes.ok) continue
    const statusBody = await statusRes.json() as OpenmartBatchStatusBody
    if (openmartBatchFailed(statusBody)) {
      throw new Error('Openmart: batch finished with errors (no match for this business)')
    }
    if (!openmartBatchReady(statusBody)) continue

    const idsRes = await fetch(`${BASE}/api/v1/task/batch/${batch_id}/task_ids?status=COMPLETED`, { headers: hdrs })
    if (!idsRes.ok) throw new Error(`Openmart: failed to fetch task IDs (${idsRes.status})`)
    const task_ids = await parseOpenmartTaskIds(idsRes)
    if (!task_ids.length) throw new Error('Openmart: batch ready but no completed task IDs')

    const taskRes = await fetch(`${BASE}/api/v1/task/${task_ids[0]}`, { headers: hdrs })
    if (!taskRes.ok) throw new Error(`Openmart: failed to fetch task result (${taskRes.status})`)
    const task = await taskRes.json() as { status?: string }

    if (task.status === 'ERRORED') {
      throw new Error('Openmart: task errored (business not in registry or missing domain)')
    }

    const parsed = parseOpenmartTaskResult(task)
    return {
      ownerName: parsed.ownerName,
      ownerTitle: parsed.ownerTitle,
      ownerEmail: parsed.ownerEmail,
      ownerMobile: parsed.ownerMobile,
      ownerLinkedin: parsed.ownerLinkedin,
      openmartPeople: parsed.openmartPeople,
      enrichedAt: parsed.enrichedAt,
    }
  }
  throw new Error('Openmart: timed out waiting for batch result (>120 s)')
}

// ── Step 2: Lusha (US) ───────────────────────────────────────────────────────

async function enrichWithLusha(
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string,
): Promise<ExploriumResult> {
  const BASE = 'https://api.lusha.com/v3'
  const hdrs = { 'api_key': apiKey, 'Content-Type': 'application/json' }

  // Search by name + domain; if no name, domain-only search (Lusha returns top contact)
  const searchBody: Record<string, string> = { companyDomain: domain }
  if (firstName) searchBody.firstName = firstName
  if (lastName)  searchBody.lastName  = lastName

  const searchRes = await fetch(`${BASE}/contacts/search`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(searchBody),
  })
  if (!searchRes.ok) throw new Error(`Lusha search: ${searchRes.status}`)
  const searchJson = await searchRes.json() as { contacts?: Array<{ id?: string }> }

  const id = searchJson.contacts?.[0]?.id
  if (!id) throw new Error(`Lusha: no match for ${firstName} ${lastName}`)

  // Enrich to get phone types
  const enrichRes = await fetch(`${BASE}/contacts/enrich`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({ ids: [id] }),
  })
  if (!enrichRes.ok) throw new Error(`Lusha enrich: ${enrichRes.status}`)
  const enrichJson = await enrichRes.json() as {
    contacts?: Array<{
      phoneNumbers?: Array<{ number?: string; type?: string }>
      emails?: Array<{ email?: string }>
    }>
  }

  const c = enrichJson.contacts?.[0]
  const mobile = c?.phoneNumbers?.find(p => p.type === 'mobile' || p.type === 'direct')?.number
              ?? c?.phoneNumbers?.[0]?.number

  return {
    ownerMobile: mobile                    || undefined,
    ownerEmail:  c?.emails?.[0]?.email    || undefined,
    enrichedAt:  new Date().toISOString(),
  }
}

// ── Step 3b: Cognism (UK) ─────────────────────────────────────────────────────

async function enrichWithCognism(
  firstName: string,
  lastName: string,
  companyName: string,
  domain: string,
  apiKey: string,
): Promise<ExploriumResult> {
  const BASE = 'https://app.cognism.com/api/search'
  const hdrs = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // Search — preview only, no credits
  const searchRes = await fetch(`${BASE}/contact/search`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({ firstName, lastName, companyName, companyDomain: domain, page: 1, pageSize: 5 }),
  })
  if (!searchRes.ok) throw new Error(`Cognism search: ${searchRes.status}`)
  const searchJson = await searchRes.json() as { data?: { contacts?: Array<{ id?: string }> } }

  const id = searchJson.data?.contacts?.[0]?.id
  if (!id) throw new Error(`Cognism: no match for ${firstName} ${lastName}`)

  // Redeem — credits consumed, returns verified mobile/direct
  const redeemRes = await fetch(`${BASE}/contact/redeem`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({ ids: [id] }),
  })
  if (!redeemRes.ok) throw new Error(`Cognism redeem: ${redeemRes.status}`)
  const redeemJson = await redeemRes.json() as {
    data?: { contacts?: Array<{ mobilePhone?: string; directDial?: string; businessEmail?: string }> }
  }

  const c = redeemJson.data?.contacts?.[0]
  return {
    ownerMobile: c?.mobilePhone || c?.directDial || undefined,
    ownerPhone:  c?.directDial  || undefined,
    ownerEmail:  c?.businessEmail                || undefined,
    enrichedAt:  new Date().toISOString(),
  }
}

// ── UK Companies House — search, officers, PSC, registered office ─────────────

const CH_BASE = 'https://api.company-information.service.gov.uk'

interface CompaniesHouseLookup {
  companyNumber?: string
  companyName?: string
  companyStatus?: string
  registeredOfficeAddress?: string
  directorName?: string
  directorRole?: string
  pscName?: string
  ownerName?: string
  source?: 'officers' | 'psc'
}

function chAuthHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Basic ${btoa(apiKey + ':')}` }
}

function formatChAddress(addr: {
  premises?: string
  address_line_1?: string
  address_line_2?: string
  locality?: string
  region?: string
  postal_code?: string
  country?: string
}): string {
  return [
    addr.premises,
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country,
  ].filter(Boolean).join(', ')
}

function assertCompaniesHouseConfig(settings: AppSettings): void {
  const needsSearch = settings.companiesHouseUseOfficers
    || settings.companiesHouseUsePsc
    || settings.companiesHouseUseRegisteredAddress
  if (needsSearch && !settings.companiesHouseUseSearch) {
    throw new Error('Companies House: enable Company search — required for other endpoints.')
  }
  if (!settings.companiesHouseUseSearch
    && !settings.companiesHouseUseOfficers
    && !settings.companiesHouseUsePsc
    && !settings.companiesHouseUseRegisteredAddress) {
    throw new Error('Companies House: enable at least one API endpoint in Settings.')
  }
}

function mapChToExplorium(ch: CompaniesHouseLookup): ExploriumResult {
  const ownerName = ch.directorName || ch.pscName
  const ownerType: 'officers' | 'psc' | undefined = ch.directorName
    ? 'officers'
    : ch.pscName ? 'psc' : ch.source
  const label = ch.companyName ?? ch.companyNumber ?? 'UK company'
  let source = `Companies House — ${label}`
  if (ownerName) {
    source = ownerType === 'psc'
      ? `Companies House (PSC) — ${label}`
      : `Companies House (director) — ${label}`
  } else if (ch.companyNumber) {
    source = `Companies House — matched, no director/PSC person`
  }
  return {
    ownerName,
    businessId: ch.companyNumber,
    companiesHouseCompanyName: ch.companyName,
    companiesHouseCompanyNumber: ch.companyNumber,
    companiesHouseCompanyStatus: ch.companyStatus,
    companiesHouseRegisteredAddress: ch.registeredOfficeAddress,
    companiesHouseDirectorName: ch.directorName,
    companiesHouseDirectorRole: ch.directorRole,
    companiesHousePscName: ch.pscName,
    companiesHouseOwnerType: ownerType,
    companiesHouseMatched: !!ch.companyNumber,
    companiesHouseNoOwner: !!ch.companyNumber && !ownerName,
    enrichedAt: new Date().toISOString(),
    source,
  }
}

async function lookupCompaniesHouse(
  businessName: string,
  settings: AppSettings,
): Promise<CompaniesHouseLookup | undefined> {
  assertCompaniesHouseConfig(settings)
  const apiKey = chApiKey(settings)
  if (!apiKey) return undefined

  const auth = chAuthHeaders(apiKey)
  const result: CompaniesHouseLookup = {}

  if (settings.companiesHouseUseSearch) {
    const searchRes = await fetch(
      `${CH_BASE}/search/companies?q=${encodeURIComponent(businessName)}&items_per_page=5`,
      { headers: auth },
    )
    if (!searchRes.ok) return undefined
    const searchJson = await searchRes.json() as {
      items?: Array<{ company_number?: string; title?: string; company_status?: string }>
    }
    const company = searchJson.items?.[0]
    if (!company?.company_number) return undefined
    result.companyNumber = company.company_number
    result.companyName = company.title
    result.companyStatus = company.company_status
  }

  if (!result.companyNumber) return undefined

  const { companyNumber } = result

  if (settings.companiesHouseUseOfficers) {
    const officersRes = await fetch(
      `${CH_BASE}/company/${companyNumber}/officers?items_per_page=10`,
      { headers: auth },
    )
    if (officersRes.ok) {
      const officersJson = await officersRes.json() as {
        items?: Array<{ name?: string; officer_role?: string; resigned_on?: string }>
      }
      const director = officersJson.items?.find(
        o => !o.resigned_on && (o.officer_role === 'director' || o.officer_role === 'llp-designated-member'),
      )
      if (director?.name) {
        result.directorName = director.name
        result.directorRole = director.officer_role
      }
    }
  }

  if (settings.companiesHouseUsePsc) {
    const pscRes = await fetch(
      `${CH_BASE}/company/${companyNumber}/persons-with-significant-control?items_per_page=10`,
      { headers: auth },
    )
    if (pscRes.ok) {
      const pscJson = await pscRes.json() as {
        items?: Array<{
          kind?: string
          name?: string
          name_elements?: { forename?: string; surname?: string }
          ceased_on?: string
        }>
      }
      const individual = pscJson.items?.find(
        p => !p.ceased_on && p.kind?.includes('individual'),
      )
      if (individual) {
        result.pscName = individual.name
          || [individual.name_elements?.forename, individual.name_elements?.surname].filter(Boolean).join(' ')
          || undefined
      }
    }
  }

  if (settings.companiesHouseUseRegisteredAddress) {
    const addrRes = await fetch(
      `${CH_BASE}/company/${companyNumber}/registered-office-address`,
      { headers: auth },
    )
    if (addrRes.ok) {
      const addrJson = await addrRes.json() as Parameters<typeof formatChAddress>[0]
      const formatted = formatChAddress(addrJson)
      if (formatted) result.registeredOfficeAddress = formatted
    }
  }

  result.ownerName = result.directorName || result.pscName
  result.source = result.directorName ? 'officers' : result.pscName ? 'psc' : undefined
  return result
}

async function extractActiveTab(): Promise<ExtractedPageData | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url) return null
  const isLinkedIn = tab.url.includes('linkedin.com')
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' }) as ExtractedPageData
  } catch {
    try {
      await injectContentScript(tab.id)
      if (isLinkedIn) await new Promise(r => setTimeout(r, 800))
      return await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' }) as ExtractedPageData
    } catch { /* restricted page */ }
    return null
  }
}
