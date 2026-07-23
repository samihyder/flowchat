import { BUILTIN_COMPANIES_HOUSE_API_KEY } from '../config/builtin-keys'
import type { ScanLead } from '../types/scan'
import type { AppSettings } from '../types/settings'

const API_KEY_FIELDS = [
  'companiesHouseApiKey',
  'openmartApiKey',
  'cognismApiKey',
  'lushaApiKey',
  'exploriumApiKey',
  'pdlApiKey',
] as const satisfies ReadonlyArray<keyof AppSettings>

/** All four CH API endpoints (one API key, four GET routes). */
export const CH_ENDPOINT_DEFAULTS = {
  companiesHouseUseSearch: true,
  companiesHouseUseOfficers: true,
  companiesHouseUsePsc: true,
  companiesHouseUseRegisteredAddress: true,
} as const

/** CH runs only in CH-only test mode or Local SMB live waterfall. */
export function chLiveModeActive(s: AppSettings): boolean {
  return s.companiesHouseOnlyTest || s.localSmbMode
}

/** Effective CH key: saved settings → built-in hardcoded fallback. */
export function chApiKey(settings: AppSettings): string {
  return settings.companiesHouseApiKey?.trim()
    || BUILTIN_COMPANIES_HOUSE_API_KEY.trim()
    || ''
}

export function chUsesBuiltinKey(settings: AppSettings): boolean {
  return !settings.companiesHouseApiKey?.trim() && !!BUILTIN_COMPANIES_HOUSE_API_KEY.trim()
}

/** Apply built-in CH key — fills Settings field when empty. */
export function applyBuiltinApiKeys(settings: AppSettings): AppSettings {
  const builtin = BUILTIN_COMPANIES_HOUSE_API_KEY.trim()
  const stored = settings.companiesHouseApiKey?.trim() ?? ''
  const key = stored || builtin
  if (!key) return settings
  return {
    ...settings,
    companiesHouseApiKey: key,
    companiesHouseEnabled: settings.companiesHouseEnabled ?? true,
  }
}

/**
 * When CH test mode or Local SMB live mode is on, force CH provider + all 4 endpoints on.
 * Ignores manual "disabled" toggle so sales flow always has search → officers → PSC → address.
 */
export function resolveChSettings(s: AppSettings): AppSettings {
  const base = applyBuiltinApiKeys(s)
  if (!chLiveModeActive(base)) return base
  return {
    ...base,
    companiesHouseEnabled: true,
    ...CH_ENDPOINT_DEFAULTS,
  }
}

export function chEndpointSummary(s: AppSettings): string {
  const r = resolveChSettings(s)
  const parts = [
    r.companiesHouseUseSearch && 'search',
    r.companiesHouseUseOfficers && 'officers',
    r.companiesHouseUsePsc && 'PSC',
    r.companiesHouseUseRegisteredAddress && 'address',
  ].filter(Boolean)
  return parts.length ? parts.join(' → ') : 'no endpoints enabled'
}

export type ChReadiness = { ok: boolean; reason?: string; loading?: boolean }

/** True when CH can run API calls in active mode (test or live SMB). */
export function chIsReady(s: AppSettings, settingsLoaded = true): ChReadiness {
  if (!settingsLoaded) return { ok: false, loading: true, reason: 'Loading settings…' }
  if (!chLiveModeActive(s)) {
    return { ok: false, reason: 'Enable CH test mode or Local SMB mode in Settings' }
  }
  const r = resolveChSettings(s)
  if (!chApiKey(r)) return { ok: false, reason: 'API key missing — paste in Settings or built-in config' }
  if (!r.companiesHouseUseSearch) return { ok: false, reason: 'Enable Company search endpoint in Settings' }
  if (!r.companiesHouseUseOfficers && !r.companiesHouseUsePsc && !r.companiesHouseUseRegisteredAddress) {
    return { ok: false, reason: 'Enable Officers, PSC, or Registered address endpoint in Settings' }
  }
  return { ok: true }
}

/** Block owner lookup only in CH-only test mode. */
export function chBlocksOwnerLookup(s: AppSettings, settingsLoaded = true): ChReadiness {
  if (!s.companiesHouseOnlyTest) return { ok: true }
  return chIsReady(s, settingsLoaded)
}

/** Settings payload for background enrich. */
export function pickEnrichSettings(settings: AppSettings): Partial<AppSettings> {
  const resolved = resolveChSettings(settings)
  return {
    localSmbMode: resolved.localSmbMode,
    enrichmentProvider: resolved.enrichmentProvider,
    companiesHouseOnlyTest: resolved.companiesHouseOnlyTest,
    companiesHouseEnabled: resolved.companiesHouseEnabled,
    companiesHouseApiKey: chApiKey(resolved),
    companiesHouseUseSearch: resolved.companiesHouseUseSearch,
    companiesHouseUseOfficers: resolved.companiesHouseUseOfficers,
    companiesHouseUsePsc: resolved.companiesHouseUsePsc,
    companiesHouseUseRegisteredAddress: resolved.companiesHouseUseRegisteredAddress,
    openmartEnabled: resolved.openmartEnabled,
    openmartApiKey: resolved.openmartApiKey,
    cognismEnabled: resolved.cognismEnabled,
    cognismApiKey: resolved.cognismApiKey,
    lushaEnabled: resolved.lushaEnabled,
    lushaApiKey: resolved.lushaApiKey,
    exploriumEnabled: resolved.exploriumEnabled,
    exploriumApiKey: resolved.exploriumApiKey,
    pdlEnabled: resolved.pdlEnabled,
    pdlApiKey: resolved.pdlApiKey,
  }
}

/** Merge stored + panel settings; empty panel keys never wipe stored/built-in keys. */
export function mergeEnrichSettings(stored: AppSettings, panel?: Partial<AppSettings> | null): AppSettings {
  const base = resolveChSettings(applyBuiltinApiKeys(stored))
  if (!panel) return base
  const merged: AppSettings = { ...base, ...panel }
  for (const field of API_KEY_FIELDS) {
    const panelVal = typeof panel[field] === 'string' ? panel[field].trim() : ''
    const storedVal = typeof base[field] === 'string' ? (base[field] as string).trim() : ''
    merged[field] = (panelVal || storedVal) as AppSettings[typeof field]
  }
  merged.companiesHouseApiKey = chApiKey(merged)
  return resolveChSettings(merged)
}

/** Patch to apply when toggling CH test or Local SMB live mode. */
export function chModeEnablePatch(current: AppSettings, mode: 'test' | 'live'): Partial<AppSettings> {
  if (mode === 'test') {
    const on = !current.companiesHouseOnlyTest
    return on
      ? { companiesHouseOnlyTest: true, companiesHouseEnabled: true, ...CH_ENDPOINT_DEFAULTS }
      : { companiesHouseOnlyTest: false }
  }
  const on = !current.localSmbMode
  return on
    ? { localSmbMode: true, enrichmentProvider: 'waterfall', companiesHouseEnabled: true, ...CH_ENDPOINT_DEFAULTS }
    : { localSmbMode: false, enrichmentProvider: 'waterfall' as const }
}

/** Map enrichment API result onto editable lead fields (CH register + Openmart owner). */
export function applyCompaniesHouseFields(
  lead: ScanLead,
  d: ScanLead['exploriumData'],
): Partial<ScanLead> {
  if (!d) return {}

  const hasCh = !!(d.companiesHouseMatched || d.companiesHouseCompanyNumber)
  const hasOm = (d.openmartPeople?.length ?? 0) > 0 || !!d.ownerMobile

  if (!hasCh && !hasOm && !d.ownerName) return { exploriumData: d }

  const registerOwner = d.companiesHouseDirectorName || d.companiesHousePscName
  const outreachOwner = d.ownerName || registerOwner || lead.ownerName

  return {
    exploriumData: d,
    registeredCompanyName: d.companiesHouseCompanyName || lead.registeredCompanyName,
    companyNumber: d.companiesHouseCompanyNumber || lead.companyNumber,
    companyStatus: d.companiesHouseCompanyStatus || lead.companyStatus,
    registeredOfficeAddress: d.companiesHouseRegisteredAddress || lead.registeredOfficeAddress,
    directorName: d.companiesHouseDirectorName || lead.directorName,
    directorRole: d.companiesHouseDirectorRole || lead.directorRole,
    pscName: d.companiesHousePscName || lead.pscName,
    ownerName: outreachOwner,
    ownerLinkedinUrl: d.ownerLinkedin || lead.ownerLinkedinUrl,
  }
}

export function hasCompaniesHouseData(lead: ScanLead): boolean {
  return !!(
    lead.exploriumData?.companiesHouseMatched
    || lead.exploriumData?.companiesHouseCompanyNumber
    || lead.registeredCompanyName
    || lead.companyNumber
    || lead.registeredOfficeAddress
    || lead.directorName
    || lead.pscName
  )
}
