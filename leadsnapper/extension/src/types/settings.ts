import type { SearchConfig } from './lead'

/** @deprecated Kept empty for migration; scrape-only product has no brands. */
export interface AppBrand {
  id: string
  name: string
  services: string[]
}

/** @deprecated Kept empty for migration; scrape-only product has no presets. */
export interface AppPreset {
  id: string
  name: string
  emoji: string
  brandId: string
  config: SearchConfig
}

/** @deprecated Kept empty for migration; scrape-only product has no keyword banks. */
export interface KeywordGroup {
  id: string
  name: string
  keywords: string[]
}

export type EnrichmentProvider = 'explorium' | 'pdl' | 'both' | 'waterfall'

/**
 * LeadSnapper v2 — scrape-only settings.
 * Paid enrichment APIs, brands, presets, and keyword banks are removed from the product.
 * Only FlowChat CRM sync credentials remain configurable.
 */
export interface AppSettings {
  brands: AppBrand[]
  presets: AppPreset[]
  keywordGroups: KeywordGroup[]
  autoSave: boolean
  searchHistory: string[]
  exploriumApiKey: string
  exploriumEnabled: boolean
  pdlApiKey: string
  pdlEnabled: boolean
  openmartApiKey: string
  openmartEnabled: boolean
  lushaApiKey: string
  lushaEnabled: boolean
  cognismApiKey: string
  cognismEnabled: boolean
  companiesHouseApiKey: string
  companiesHouseEnabled: boolean
  companiesHouseOnlyTest: boolean
  companiesHouseUseSearch: boolean
  companiesHouseUseOfficers: boolean
  companiesHouseUsePsc: boolean
  companiesHouseUseRegisteredAddress: boolean
  enrichmentProvider: EnrichmentProvider
  localSmbMode: boolean
  flowCrmApiUrl: string
  flowCrmApiKey: string
  flowCrmSyncEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  brands: [],
  presets: [],
  keywordGroups: [],
  autoSave: false,
  searchHistory: [],
  exploriumApiKey: '',
  exploriumEnabled: false,
  pdlApiKey: '',
  pdlEnabled: false,
  openmartApiKey: '',
  openmartEnabled: false,
  lushaApiKey: '',
  lushaEnabled: false,
  cognismApiKey: '',
  cognismEnabled: false,
  companiesHouseApiKey: '',
  companiesHouseEnabled: false,
  companiesHouseOnlyTest: false,
  companiesHouseUseSearch: false,
  companiesHouseUseOfficers: false,
  companiesHouseUsePsc: false,
  companiesHouseUseRegisteredAddress: false,
  enrichmentProvider: 'waterfall',
  localSmbMode: true,
  flowCrmApiUrl: '',
  flowCrmApiKey: '',
  flowCrmSyncEnabled: false,
}
