import { useReducer, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Lead, SearchConfig, ExtractedPageData } from '../types/lead'
import type { ScanLead, EnrichedData } from '../types/scan'
import { scoreScanLead } from '../types/scan'
import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'
import { scoreLead } from '../scoring/scorer'
import { checkDuplicate } from '../utils/dedup'
import { extractDomain } from '../utils/regex'
import { loadSettings, mergeSettings, saveSettings } from '../utils/storage'
import { filterScanLeads } from '../utils/scanFilters'
import { scanToLead } from '../utils/scanToLead'
import { mergeScanLeads } from '../utils/leadKey'
import { applyCompaniesHouseFields } from '../utils/companiesHouse'

import SearchTab   from './tabs/SearchTab'
import ScanTab     from './tabs/ScanTab'
import CaptureTab  from './tabs/CaptureTab'
import SessionTab  from './tabs/SessionTab'
import ExportTab   from './tabs/ExportTab'
import SettingsTab from './tabs/SettingsTab'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'search' | 'scan' | 'capture' | 'session' | 'export' | 'settings'

interface AppState {
  tab: Tab
  settings: AppSettings
  settingsLoaded: boolean
  searchConfig: SearchConfig

  // Scan flow
  scanLeads: ScanLead[]
  scanning: boolean
  scanQuery?: string
  scanFilteredCount: number
  configFilteredCount: number

  // Legacy single-capture (for website/LinkedIn pages)
  detected: ExtractedPageData | null
  draft: Partial<Lead>
  leads: Lead[]

  toast: string | null
  duplicateOf: Lead | null
  captureLoading: boolean
  selectedLeads: Set<string>
}

type AppAction =
  | { type: 'SETTINGS_LOADED'; settings: AppSettings }
  | { type: 'UPDATE_SETTINGS'; settings: AppSettings }
  | { type: 'SET_TAB'; tab: Tab }

  // Scan
  | { type: 'SET_SCANNING'; v: boolean }
  | { type: 'SCAN_RESULTS'; leads: Partial<ScanLead>[]; query?: string; filteredCount?: number }
  | { type: 'NEW_SCAN_RESULTS'; leads: Partial<ScanLead>[] }
  | { type: 'ENRICH_STATUS'; id: string; status: ScanLead['enrichStatus'] }
  | { type: 'ENRICH_RESULT'; id: string; data: EnrichedData | null; score?: number; priority?: ScanLead['leadPriority']; error?: string }
  | { type: 'TOGGLE_SCAN_SELECT'; id: string }
  | { type: 'SELECT_ALL_SCAN' }
  | { type: 'SELECT_NONE_SCAN' }
  | { type: 'SELECT_HOT_SCAN' }
  | { type: 'UPDATE_SCAN_LEAD'; id: string; patch: Partial<ScanLead> }
  | { type: 'EXPLORIUM_START';  id: string }
  | { type: 'EXPLORIUM_RESULT'; id: string; data?: ScanLead['exploriumData']; error?: string }

  // Legacy capture
  | { type: 'PAGE_EXTRACTED'; data: ExtractedPageData }
  | { type: 'UPDATE_DRAFT'; patch: Partial<Lead> }
  | { type: 'SAVE_LEAD' }
  | { type: 'UPDATE_LEAD'; leadId: string; patch: Partial<Lead> }
  | { type: 'DELETE_LEAD'; leadId: string }
  | { type: 'SET_SEARCH_CONFIG'; config: SearchConfig }
  | { type: 'TOAST'; msg: string | null }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_CAPTURE_LOADING'; v: boolean }
  | { type: 'TOGGLE_SELECT'; leadId: string }
  | { type: 'SELECT_ALL' }
  | { type: 'SELECT_NONE' }
  | { type: 'DISMISS_DUPLICATE' }
  | { type: 'DISMISS_CAPTURE' }
  | { type: 'SAVE_SCAN_TO_SESSION'; ids: string[] }

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SEARCH: SearchConfig = {
  targetMarket: 'UK',
  country: 'United Kingdom',
  city: '',
  complianceRegion: 'UK',
}

function makeScanLead(partial: Partial<ScanLead>): ScanLead {
  const base: ScanLead = {
    id:            partial.id ?? uuidv4(),
    sourceType:    partial.sourceType ?? 'Google Search',
    sourceUrl:     partial.sourceUrl ?? '',
    businessName:  partial.businessName ?? 'Unknown',
    enrichStatus:  'pending',
    ownerVerified: false,
    serviceFit:    [],
    selected:      false,
    verified:      false,
    leadScore:     partial.leadScore ?? 0,
    leadPriority:  partial.leadPriority ?? 'Cold',
    captureDate:   partial.captureDate ?? new Date().toISOString().slice(0, 10),
    captureTime:   partial.captureTime ?? new Date().toTimeString().slice(0, 8),
    ...partial,
  }
  const { score, priority } = scoreScanLead(base)
  return { ...base, leadScore: score, leadPriority: priority }
}

function buildDraft(detected: ExtractedPageData | null, cfg: SearchConfig, settings: AppSettings): Partial<Lead> {
  const defaultBrand = settings.brands[0]?.name ?? ''
  const base: Partial<Lead> = {
    sourceType:    detected?.sourceType ?? 'Manual',
    sourceUrl:     detected?.sourceUrl  ?? '',
    captureDate:   new Date().toISOString().slice(0, 10),
    captureTime:   new Date().toTimeString().slice(0, 8),
    businessName:  detected?.businessName,
    website:       detected?.website,
    domain:        detected?.domain ?? (detected?.website ? extractDomain(detected.website) : undefined),
    phone:         detected?.phone,
    email:         detected?.email,
    address:       detected?.address,
    city:          detected?.city    ?? cfg.city,
    country:       detected?.country ?? cfg.country,
    googleRating:  detected?.googleRating,
    googleReviews: detected?.googleReviews,
    category:      detected?.category,
    industry:      detected?.industry,
    linkedinUrl:   detected?.linkedinUrl,
    ownerName:     detected?.ownerName,
    decisionMakerLinkedin: detected?.decisionMakerLinkedin,
    facebookUrl:   detected?.facebookUrl,
    instagramUrl:  detected?.instagramUrl,
    technologyDetected: detected?.technologyDetected,
    hasChatWidget:      detected?.hasChatWidget,
    hasContactForm:     detected?.hasContactForm,
    hasOnlineOrdering:  detected?.hasOnlineOrdering,
    hasBookingSystem:   detected?.hasBookingSystem,
    securitySignal:     detected?.securitySignal,
    brandFit:      (cfg.brandFit ?? defaultBrand) || '',
    serviceFit:    cfg.serviceFit ?? [],
    leadStatus:    'New',
    outreachBasis: 'Legitimate Interest - B2B',
    optOutStatus:  'Active',
    doNotContact:  false,
    crmSyncStatus: 'not_synced',
  }
  const { score, priority } = scoreLead(base)
  return { ...base, leadScore: score, leadPriority: priority }
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SETTINGS_LOADED':
      return { ...state, settings: mergeSettings(action.settings), settingsLoaded: true }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: mergeSettings(action.settings) }
    case 'SET_TAB':
      return { ...state, tab: action.tab }

    // ── Scan ──
    case 'SET_SCANNING':
      return { ...state, scanning: action.v }

    case 'SCAN_RESULTS': {
      const raw     = action.leads.map(makeScanLead)
      const { kept, configFiltered } = filterScanLeads(raw, state.searchConfig)
      const scanToast = raw.length > 0 && kept.length === 0 && configFiltered > 0
        ? `${raw.length} businesses found but hidden by active filters (Settings / Find tab).`
        : null
      const keyword = kept[0]?.searchQuery ?? state.searchConfig.keyword ?? action.query ?? ''
      const history = state.settings.searchHistory
      const newHistory = keyword && !history.includes(keyword)
        ? [keyword, ...history].slice(0, 50)
        : history
      const newSettings = newHistory !== history
        ? { ...state.settings, searchHistory: newHistory }
        : state.settings
      const withBrand = kept.map(l => ({
        ...l,
        brandFit: l.brandFit ?? state.searchConfig.brandFit,
        serviceFit: l.serviceFit?.length ? l.serviceFit : (state.searchConfig.serviceFit ?? []),
        searchQuery: l.searchQuery ?? keyword,
      }))
      const merged = mergeScanLeads(state.scanLeads, withBrand)
      return {
        ...state,
        scanLeads: merged,
        scanning: false,
        tab: 'scan',
        scanQuery: keyword || action.query,
        scanFilteredCount: action.filteredCount ?? 0,
        configFilteredCount: configFiltered,
        settings: newSettings,
        toast: scanToast ?? state.toast,
      }
    }

    case 'NEW_SCAN_RESULTS': {
      const incoming = filterScanLeads(action.leads.map(makeScanLead), state.searchConfig).kept
      return { ...state, scanLeads: mergeScanLeads(state.scanLeads, incoming) }
    }

    case 'ENRICH_STATUS':
      return {
        ...state,
        scanLeads: state.scanLeads.map(l =>
          l.id === action.id ? { ...l, enrichStatus: action.status } : l
        ),
      }

    case 'ENRICH_RESULT': {
      return {
        ...state,
        scanLeads: state.scanLeads.map(l => {
          if (l.id !== action.id) return l
          if (!action.data) return { ...l, enrichStatus: 'failed', enrichError: action.error }
          // Patch ScanLead fields from GMB + enriched data
          const d = action.data
          return {
            ...l,
            websiteUrl:    l.websiteUrl    || d.gmbWebsiteUrl  || undefined,
            phone:         l.phone         || d.gmbPhone       || d.primaryPhone || undefined,
            address:       l.address       || d.gmbAddress     || d.schemaAddress || undefined,
            city:          l.city          || d.gmbCity        || d.schemaCity    || undefined,
            category:      l.category      || d.gmbCategory    || undefined,
            googleRating:  l.googleRating  ?? d.gmbRating      ?? undefined,
            googleReviews: l.googleReviews ?? d.gmbReviews     ?? undefined,
            ownerName:     l.ownerName     || d.ownerName      || undefined,
            directorName:  l.directorName  || d.ownerName      || undefined,
            ownerLinkedinUrl: l.ownerLinkedinUrl || d.ownerLinkedinUrl || undefined,
            enrichStatus:  'done',
            enriched:      d,
            leadScore:     action.score    ?? l.leadScore,
            leadPriority:  action.priority ?? l.leadPriority,
          }
        }),
      }
    }

    case 'TOGGLE_SCAN_SELECT':
      return { ...state, scanLeads: state.scanLeads.map(l => l.id === action.id ? { ...l, selected: !l.selected } : l) }
    case 'SELECT_ALL_SCAN':
      return { ...state, scanLeads: state.scanLeads.map(l => ({ ...l, selected: true })) }
    case 'SELECT_NONE_SCAN':
      return { ...state, scanLeads: state.scanLeads.map(l => ({ ...l, selected: false })) }
    case 'SELECT_HOT_SCAN':
      return { ...state, scanLeads: state.scanLeads.map(l => ({ ...l, selected: l.leadPriority === 'Hot' })) }
    case 'UPDATE_SCAN_LEAD':
      return {
        ...state,
        scanLeads: state.scanLeads.map(l => {
          if (l.id !== action.id) return l
          const updated = { ...l, ...action.patch }
          const { score, priority } = scoreScanLead(updated)
          return { ...updated, leadScore: score, leadPriority: priority }
        }),
      }

    case 'EXPLORIUM_START':
      return {
        ...state,
        scanLeads: state.scanLeads.map(l =>
          l.id === action.id ? { ...l, exploriumStatus: 'loading' as const, exploriumError: undefined } : l
        ),
      }

    case 'EXPLORIUM_RESULT':
      return {
        ...state,
        scanLeads: state.scanLeads.map(l => {
          if (l.id !== action.id) return l
          if (action.error) {
            const err = action.error === 'MISSING_CH_KEY'
              ? 'Add your Companies House API key in Settings → UK Companies House (free at developer.company-information.service.gov.uk)'
              : action.error.replace(/^Error:\s*/, '')
            return { ...l, exploriumStatus: 'failed' as const, exploriumError: err }
          }
          const d = action.data
          const updated: ScanLead = {
            ...l,
            exploriumStatus: 'done' as const,
            ...applyCompaniesHouseFields(l, d),
          }
          const { score, priority } = scoreScanLead(updated)
          return { ...updated, leadScore: score, leadPriority: priority }
        }),
      }

    // ── Legacy capture ──
    case 'PAGE_EXTRACTED': {
      const draft = buildDraft(action.data, state.searchConfig, state.settings)
      const dup   = checkDuplicate(draft, state.leads)
      if ((action.data.sourceType === 'Google Maps' || action.data.sourceType === 'Google Search')
          && (action.data.searchResults?.length ?? 0) > 0) {
        return { ...state, captureLoading: false }
      }
      if (state.settings.autoSave && !dup.isDuplicate) {
        const now  = new Date()
        const lead: Lead = {
          leadId: uuidv4(),
          captureDate: now.toISOString().slice(0, 10),
          captureTime: now.toTimeString().slice(0, 8),
          sourceType: draft.sourceType ?? 'Manual',
          sourceUrl: draft.sourceUrl ?? '',
          brandFit: draft.brandFit ?? state.settings.brands[0]?.name ?? '',
          serviceFit: draft.serviceFit ?? [],
          leadScore: draft.leadScore ?? 0,
          leadPriority: draft.leadPriority ?? 'Cold',
          leadStatus: 'New',
          outreachBasis: 'Legitimate Interest - B2B',
          optOutStatus: 'Active',
          doNotContact: false,
          crmSyncStatus: 'not_synced',
          ...draft,
        }
        const newLeads = [lead, ...state.leads]
        chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', payload: { count: newLeads.length } }).catch(() => {})
        return { ...state, leads: newLeads, tab: 'session', detected: null, draft: {}, duplicateOf: null, captureLoading: false, toast: `Saved: ${lead.businessName ?? 'Lead'}` }
      }
      return { ...state, tab: 'capture', detected: action.data, draft, duplicateOf: dup.isDuplicate ? dup.existingLead! : null, captureLoading: false }
    }

    case 'UPDATE_DRAFT': {
      const updated = { ...state.draft, ...action.patch }
      const { score, priority } = scoreLead(updated)
      return { ...state, draft: { ...updated, leadScore: score, leadPriority: priority } }
    }

    case 'SAVE_LEAD': {
      const now  = new Date()
      const lead: Lead = {
        leadId:        uuidv4(),
        captureDate:   now.toISOString().slice(0, 10),
        captureTime:   now.toTimeString().slice(0, 8),
        sourceType:    state.draft.sourceType   ?? 'Manual',
        sourceUrl:     state.draft.sourceUrl    ?? '',
        brandFit:      state.draft.brandFit     ?? state.settings.brands[0]?.name ?? '',
        serviceFit:    state.draft.serviceFit   ?? [],
        leadScore:     state.draft.leadScore    ?? 0,
        leadPriority:  state.draft.leadPriority ?? 'Cold',
        leadStatus:    state.draft.leadStatus   ?? 'New',
        outreachBasis: state.draft.outreachBasis ?? 'Legitimate Interest - B2B',
        optOutStatus:  state.draft.optOutStatus  ?? 'Active',
        doNotContact:  state.draft.doNotContact  ?? false,
        crmSyncStatus: 'not_synced',
        ...state.draft,
      }
      const newLeads = [lead, ...state.leads]
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', payload: { count: newLeads.length } }).catch(() => {})
      return { ...state, leads: newLeads, tab: 'session', draft: {}, detected: null, duplicateOf: null, toast: `Saved: ${lead.businessName ?? 'Lead'}` }
    }

    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map(l => {
          if (l.leadId !== action.leadId) return l
          const updated = { ...l, ...action.patch }
          const { score, priority } = scoreLead(updated)
          return { ...updated, leadScore: score, leadPriority: priority }
        }),
      }

    case 'SAVE_SCAN_TO_SESSION': {
      const toAdd: Lead[] = []
      let skipped = 0
      for (const id of action.ids) {
        const scan = state.scanLeads.find(l => l.id === id)
        if (!scan) continue
        const lead = scanToLead(scan, state.searchConfig)
        const dup = checkDuplicate(lead, [...state.leads, ...toAdd])
        if (dup.isDuplicate) { skipped++; continue }
        toAdd.push(lead)
      }
      if (toAdd.length === 0) {
        return { ...state, toast: skipped ? 'Already in pipeline' : 'Select leads first' }
      }
      const newLeads = [...toAdd, ...state.leads]
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', payload: { count: newLeads.length } }).catch(() => {})
      return {
        ...state,
        leads: newLeads,
        tab: 'session',
        scanLeads: state.scanLeads.map(l => action.ids.includes(l.id) ? { ...l, selected: false } : l),
        toast: `Added ${toAdd.length} to pipeline${skipped ? ` (${skipped} duplicate${skipped > 1 ? 's' : ''})` : ''}`,
      }
    }

    case 'DELETE_LEAD': {
      const leads = state.leads.filter(l => l.leadId !== action.leadId)
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', payload: { count: leads.length } }).catch(() => {})
      return { ...state, leads, toast: 'Lead removed' }
    }

    case 'SET_SEARCH_CONFIG':
      return { ...state, searchConfig: action.config }

    case 'TOAST':
      return { ...state, toast: action.msg }

    case 'CLEAR_SESSION':
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', payload: { count: 0 } }).catch(() => {})
      return { ...state, leads: [], draft: {}, detected: null, selectedLeads: new Set<string>(), tab: 'search', toast: 'Session cleared' }

    case 'SET_CAPTURE_LOADING':
      return { ...state, captureLoading: action.v }

    case 'TOGGLE_SELECT': {
      const sel = new Set(state.selectedLeads)
      sel.has(action.leadId) ? sel.delete(action.leadId) : sel.add(action.leadId)
      return { ...state, selectedLeads: sel }
    }
    case 'SELECT_ALL':  return { ...state, selectedLeads: new Set(state.leads.map(l => l.leadId)) }
    case 'SELECT_NONE': return { ...state, selectedLeads: new Set<string>() }
    case 'DISMISS_DUPLICATE': return { ...state, duplicateOf: null }
    case 'DISMISS_CAPTURE':  return { ...state, detected: null, draft: {}, duplicateOf: null, tab: 'search' }
  }
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function SidePanel() {
  const [state, dispatch] = useReducer(reducer, {
    tab: 'search',
    settings: DEFAULT_SETTINGS,
    settingsLoaded: false,
    searchConfig: DEFAULT_SEARCH,
    scanLeads: [],
    scanning: false,
    scanFilteredCount: 0,
    configFilteredCount: 0,
    detected: null,
    draft: {},
    leads: [],
    toast: null,
    duplicateOf: null,
    captureLoading: false,
    selectedLeads: new Set<string>(),
  })

  // Load persisted settings
  useEffect(() => {
    loadSettings().then(s => dispatch({ type: 'SETTINGS_LOADED', settings: s }))
  }, [])

  // Pick up capture started from popup before side panel port connected
  useEffect(() => {
    chrome.storage.session.get('pendingCapture', result => {
      const pending = result.pendingCapture as { data?: ExtractedPageData; ts?: number } | undefined
      if (pending?.data && pending.ts && Date.now() - pending.ts < 30_000) {
        dispatch({ type: 'PAGE_EXTRACTED', data: pending.data })
        chrome.storage.session.remove('pendingCapture').catch(() => {})
      }
    })
  }, [])

  // Persist settings on change
  useEffect(() => {
    if (!state.settingsLoaded) return
    saveSettings(state.settings)
  }, [state.settings, state.settingsLoaded])

  // Keep a ref to scanQuery so the port message handler always has the latest value
  const scanQueryRef = useRef(state.scanQuery)
  useEffect(() => { scanQueryRef.current = state.scanQuery }, [state.scanQuery])

  // Port connection + reconnection when MV3 service worker restarts
  useEffect(() => {
    let port: chrome.runtime.Port | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function connect() {
      if (stopped) return
      try {
        port = chrome.runtime.connect({ name: 'sidepanel' })

        port.onMessage.addListener((msg: { type: string; payload: unknown }) => {
          switch (msg.type) {
            case 'SCAN_RESULTS': {
              const p = msg.payload as { leads: Partial<ScanLead>[]; pageType: string; filteredCount?: number }
              dispatch({ type: 'SCAN_RESULTS', leads: p.leads, query: scanQueryRef.current, filteredCount: p.filteredCount })
              if (!p.leads?.length) {
                const msg = p.pageType === 'error'
                  ? 'Could not read this page. Refresh Google, then click Scan again.'
                  : p.pageType === 'Google Search'
                    ? 'No local businesses found. Scroll to the map/local pack, click the Places tab, or open Google Maps — then scan.'
                    : 'No local businesses on this page. Open Google Maps or the Places tab, then scan again.'
                dispatch({ type: 'TOAST', msg })
              }
              break
            }
            case 'NEW_SCAN_RESULTS': {
              const p = msg.payload as { leads: Partial<ScanLead>[] }
              dispatch({ type: 'NEW_SCAN_RESULTS', leads: p.leads })
              break
            }
            case 'ENRICH_STATUS': {
              const p = msg.payload as { id: string; status: ScanLead['enrichStatus'] }
              dispatch({ type: 'ENRICH_STATUS', id: p.id, status: p.status })
              break
            }
            case 'ENRICH_RESULT': {
              const p = msg.payload as { id: string; data: EnrichedData | null; score?: number; priority?: ScanLead['leadPriority']; error?: string }
              dispatch({ type: 'ENRICH_RESULT', id: p.id, data: p.data, score: p.score, priority: p.priority, error: p.error })
              break
            }
            case 'PAGE_EXTRACTED': {
              if (msg.payload) {
                dispatch({ type: 'PAGE_EXTRACTED', data: msg.payload as ExtractedPageData })
                chrome.storage.session.remove('pendingCapture').catch(() => {})
              } else {
                dispatch({ type: 'SET_CAPTURE_LOADING', v: false })
                dispatch({ type: 'TOAST', msg: 'Could not read this page. Refresh it and try Capture again.' })
              }
              break
            }
            case 'EXPLORIUM_RESULT': {
              const p = msg.payload as { leadId: string; data?: ScanLead['exploriumData']; error?: string }
              dispatch({ type: 'EXPLORIUM_RESULT', id: p.leadId, data: p.data, error: p.error })
              break
            }
            case 'SESSION_ENRICH_RESULT': {
              const p = msg.payload as { leadId: string; data: EnrichedData | null; error?: string }
              if (p.data) {
                dispatch({ type: 'UPDATE_LEAD', leadId: p.leadId, patch: {
                  email:              p.data.primaryEmail    || undefined,
                  primaryEmail:       p.data.primaryEmail    || undefined,
                  allEmails:          p.data.emails,
                  phone:              p.data.primaryPhone    || undefined,
                  allPhones:          p.data.phones,
                  linkedinUrl:        p.data.social?.linkedinCompany ?? p.data.social?.linkedinPerson ?? undefined,
                  facebookUrl:        p.data.social?.facebook  || undefined,
                  instagramUrl:       p.data.social?.instagram || undefined,
                  tiktokUrl:          p.data.social?.tiktok    || undefined,
                  youtubeUrl:         p.data.social?.youtube   || undefined,
                  xTwitterUrl:        p.data.social?.xTwitter  || undefined,
                  whatsappUrl:        p.data.whatsappUrl        || undefined,
                  hasWhatsApp:        p.data.hasWhatsApp,
                  technologyDetected: p.data.techStack.length ? p.data.techStack : undefined,
                  chatWidgetProvider: p.data.chatWidgetProvider,
                  hasChatWidget:      p.data.hasChatWidget,
                  hasContactForm:     p.data.hasContactForm,
                  hasOnlineOrdering:  p.data.hasOnlineOrdering,
                  hasBookingSystem:   p.data.hasBookingSystem,
                  orderPageUrl:       p.data.orderPageUrl,
                  bookingUrl:         p.data.bookingUrl,
                  hasNewsletter:      p.data.hasNewsletter,
                  hasCareersPage:     p.data.hasCareersPage,
                  hasPrivacyPolicy:   p.data.hasPrivacyPolicy,
                  securitySignal:     p.data.securitySignal,
                  metaTitle:          p.data.metaTitle,
                  metaDescription:    p.data.metaDescription,
                  socialPresenceScore: p.data.socialPresenceScore,
                  businessListings:   p.data.businessListings,
                  companyNumberFound: p.data.companyNumberFound,
                  mentionsTrademark:  p.data.mentionsTrademark,
                  mentionsDuns:       p.data.mentionsDuns,
                  mentionsCompanyReg: p.data.mentionsCompanyReg,
                  ownerName:          p.data.ownerName       || undefined,
                  ownerTitle:         p.data.ownerTitle      || undefined,
                  decisionMakerLinkedin: p.data.ownerLinkedinUrl || undefined,
                  directorName:       p.data.ownerName       || undefined,
                  address:            p.data.schemaAddress || p.data.gmbAddress || undefined,
                  city:               p.data.schemaCity    || p.data.gmbCity    || undefined,
                  teamMembersJson:    p.data.teamMembers?.length ? JSON.stringify(p.data.teamMembers) : undefined,
                }})
              }
              dispatch({ type: 'TOAST', msg: p.data ? 'Lead enriched from website' : `Enrich failed: ${p.error ?? 'unknown'}` })
              break
            }
          }
        })

        port.onDisconnect.addListener(() => {
          port = null
          // Service worker was killed by Chrome — reconnect after a short delay
          if (!stopped) reconnectTimer = setTimeout(connect, 1500)
        })
      } catch {
        // Background not ready yet — retry
        if (!stopped) reconnectTimer = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      try { port?.disconnect() } catch { /* ignore */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast
  useEffect(() => {
    if (!state.toast) return
    const t = setTimeout(() => dispatch({ type: 'TOAST', msg: null }), 3000)
    return () => clearTimeout(t)
  }, [state.toast])

  const triggerScan = useCallback(async () => {
    dispatch({ type: 'SET_SCANNING', v: true })
    try {
      await chrome.runtime.sendMessage({ type: 'SCAN_PAGE' })
    } catch {
      dispatch({ type: 'SET_SCANNING', v: false })
    }
  }, [])

  const openPlacesTab = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.includes('google.') || !tab.url.includes('/search')) return
    const u = new URL(tab.url)
    u.searchParams.set('tbm', 'lcl')
    u.searchParams.delete('udm')
    await chrome.tabs.update(tab.id, { url: u.toString() })
  }, [])

  const openGoogleMaps = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const q = state.scanQuery || state.searchConfig.keyword || ''
    const url = q
      ? `https://www.google.com/maps/search/${encodeURIComponent(q)}`
      : 'https://www.google.com/maps'
    if (tab?.id) await chrome.tabs.update(tab.id, { url })
    else await chrome.tabs.create({ url })
  }, [state.scanQuery, state.searchConfig.keyword])

  const triggerCapture = useCallback(async () => {
    dispatch({ type: 'SET_CAPTURE_LOADING', v: true })
    try {
      const res = await chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE' }) as {
        ok?: boolean
        data?: ExtractedPageData | null
      }
      if (res?.data) {
        dispatch({ type: 'PAGE_EXTRACTED', data: res.data })
        chrome.storage.session.remove('pendingCapture').catch(() => {})
      } else {
        dispatch({ type: 'SET_CAPTURE_LOADING', v: false })
        dispatch({
          type: 'TOAST',
          msg: 'Could not read this page. Open a LinkedIn profile, company page, or business website and try again.',
        })
      }
    } catch {
      dispatch({ type: 'SET_CAPTURE_LOADING', v: false })
      dispatch({ type: 'TOAST', msg: 'Capture failed — refresh the page and try again.' })
    }
  }, [])

  const reenrich = useCallback(async (lead: ScanLead) => {
    dispatch({ type: 'ENRICH_STATUS', id: lead.id, status: 'enriching' })
    await chrome.runtime.sendMessage({ type: 'ENRICH_LEAD', payload: lead }).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-sm">
      <Header
        scanCount={state.scanLeads.length}
        sessionCount={state.leads.length}
        onScan={triggerScan}
        onCapture={triggerCapture}
        scanning={state.scanning}
        capturing={state.captureLoading}
        activeTab={state.tab}
      />
      <TabBar active={state.tab} onChange={tab => dispatch({ type: 'SET_TAB', tab })} hasCapture={!!state.detected} />

      <div className="flex-1 overflow-y-auto min-h-0">
        {state.tab === 'search' && (
          <SearchTab
            onScan={triggerScan}
            scanning={state.scanning}
          />
        )}

        {state.tab === 'scan' && (
          <ScanTab
            leads={state.scanLeads}
            scanning={state.scanning}
            settings={state.settings}
            settingsLoaded={state.settingsLoaded}
            filteredCount={state.scanFilteredCount}
            configFilteredCount={state.configFilteredCount}
            sessionCount={state.leads.length}
            searchQuery={state.scanQuery}
            onSaveToSession={ids => dispatch({ type: 'SAVE_SCAN_TO_SESSION', ids })}
            onScan={triggerScan}
            onOpenPlacesTab={openPlacesTab}
            onOpenGoogleMaps={openGoogleMaps}
            onToggleSelect={id => dispatch({ type: 'TOGGLE_SCAN_SELECT', id })}
            onSelectAll={() => dispatch({ type: 'SELECT_ALL_SCAN' })}
            onSelectNone={() => dispatch({ type: 'SELECT_NONE_SCAN' })}
            onSelectHot={() => dispatch({ type: 'SELECT_HOT_SCAN' })}
            onUpdateLead={(id, patch) => dispatch({ type: 'UPDATE_SCAN_LEAD', id, patch })}
            onReenrich={reenrich}
            onOpenSettings={() => dispatch({ type: 'SET_TAB', tab: 'settings' })}
            onExploriumEnrich={(_lead, _provider) => {
              dispatch({
                type: 'TOAST',
                msg: 'Paid enrichment APIs were removed. LeadSnapper only scrapes public pages.',
              })
            }}
          />
        )}

        {state.tab === 'capture' && (
          <CaptureTab
            detected={state.detected}
            draft={state.draft}
            duplicateOf={state.duplicateOf}
            settings={state.settings}
            onUpdateDraft={patch => dispatch({ type: 'UPDATE_DRAFT', patch })}
            onSave={() => dispatch({ type: 'SAVE_LEAD' })}
            onDismissDuplicate={() => dispatch({ type: 'DISMISS_DUPLICATE' })}
            onUpdateExisting={() => {
              if (state.duplicateOf) {
                dispatch({ type: 'UPDATE_LEAD', leadId: state.duplicateOf.leadId, patch: state.draft })
              }
              dispatch({ type: 'DISMISS_CAPTURE' })
            }}
            onSelectSearchResult={r => dispatch({ type: 'UPDATE_DRAFT', patch: {
              businessName: r.title,
              website: r.url,
              domain: r.domain,
              sourceUrl: r.url,
              sourceType: 'Google Search',
              googleRank: r.rank,
            }})}
          />
        )}

        {state.tab === 'session' && (
          <SessionTab
            leads={state.leads}
            selectedLeads={state.selectedLeads}
            onToggleSelect={id => dispatch({ type: 'TOGGLE_SELECT', leadId: id })}
            onSelectAll={() => dispatch({ type: 'SELECT_ALL' })}
            onSelectNone={() => dispatch({ type: 'SELECT_NONE' })}
            onUpdate={(id, patch) => dispatch({ type: 'UPDATE_LEAD', leadId: id, patch })}
            onDelete={id => dispatch({ type: 'DELETE_LEAD', leadId: id })}
            onEnrichLead={(leadId, url) => chrome.runtime.sendMessage({ type: 'ENRICH_SESSION_LEAD', payload: { leadId, url } }).catch(() => {})}
          />
        )}

        {state.tab === 'export' && (
          <ExportTab
            leads={state.leads}
            selectedLeads={state.selectedLeads}
            searchConfig={state.searchConfig}
            settings={state.settings}
            onClearSession={() => dispatch({ type: 'CLEAR_SESSION' })}
            onToast={msg => dispatch({ type: 'TOAST', msg })}
            onSyncResults={results => {
              for (const r of results) {
                if (!r.leadId) continue
                dispatch({
                  type: 'UPDATE_LEAD',
                  leadId: r.leadId,
                  patch: {
                    crmSyncStatus: r.error ? 'failed' : 'synced',
                    crmContactId: r.contactId || undefined,
                    crmSyncError: r.error,
                  },
                })
              }
            }}
          />
        )}

        {state.tab === 'settings' && (
          <SettingsTab
            settings={state.settings}
            onChange={s => dispatch({ type: 'UPDATE_SETTINGS', settings: s })}
          />
        )}
      </div>

      {state.toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap">
          {state.toast}
        </div>
      )}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ scanCount, sessionCount, onScan, onCapture, scanning, capturing, activeTab }: {
  scanCount: number; sessionCount: number
  onScan: () => void; onCapture: () => void
  scanning: boolean; capturing: boolean; activeTab: Tab
}) {
  const count = activeTab === 'scan' ? scanCount : sessionCount
  return (
    <div className="bg-navy-600 text-white px-3 py-2.5 flex items-center gap-2 shrink-0">
      <span className="font-bold text-sm tracking-tight">LeadSnapper</span>
      {count > 0 && <span className="bg-white text-navy-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
      <div className="ml-auto flex gap-1.5">
        <button
          onClick={onScan}
          disabled={scanning}
          className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-60"
          title="Scan current Google Search / Maps page"
        >
          {scanning ? <SpinIcon /> : <RadarIcon />}
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
        {activeTab !== 'scan' && (
          <button
            onClick={onCapture}
            disabled={capturing}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-60"
            title="Capture single page"
          >
            {capturing ? <SpinIcon /> : <CamIcon />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, hasCapture }: { active: Tab; onChange: (t: Tab) => void; hasCapture: boolean }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'search',   label: 'Scrape'    },
    { id: 'scan',     label: 'Results'   },
    ...(hasCapture ? [{ id: 'capture' as Tab, label: 'Capture' }] : []),
    { id: 'session',  label: 'Saved'     },
    { id: 'export',   label: 'Export'    },
    { id: 'settings', label: 'Sync'      },
  ]
  return (
    <div className="flex border-b border-gray-200 bg-white shrink-0">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${active === t.id ? 'text-navy-600 border-b-2 border-navy-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function SpinIcon() { return <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> }
function RadarIcon() { return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><circle cx="12" cy="12" r="5" strokeWidth={2}/><path d="M12 12 L17 7" strokeWidth={2} strokeLinecap="round"/></svg> }
function CamIcon() { return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg> }
