import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

const STORAGE_KEY = 'leadsnapper_settings'

/** Load settings; always wipe enrichment/preset/keyword product surface. */
export function mergeSettings(stored?: Partial<AppSettings> | null): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    flowCrmApiUrl: stored?.flowCrmApiUrl?.trim() || '',
    flowCrmApiKey: stored?.flowCrmApiKey?.trim() || '',
    flowCrmSyncEnabled: Boolean(stored?.flowCrmSyncEnabled),
    autoSave: Boolean(stored?.autoSave),
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return mergeSettings(result[STORAGE_KEY] as Partial<AppSettings> | undefined)
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        flowCrmApiUrl: settings.flowCrmApiUrl,
        flowCrmApiKey: settings.flowCrmApiKey,
        flowCrmSyncEnabled: settings.flowCrmSyncEnabled,
        autoSave: settings.autoSave,
      },
    })
  } catch {
    // non-fatal
  }
}

export function brandById(_settings: AppSettings, _brandId: string) {
  return undefined
}

export function servicesForBrand(_settings: AppSettings, _brandName: string): string[] {
  return []
}

export function allServices(_settings: AppSettings): string[] {
  return []
}
