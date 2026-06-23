import type { EnrichmentProviderId } from '@/lib/credentials/types';
import type { VerifyResult } from '@/lib/credentials/types';
import { cognismProvider } from '@/lib/credentials/providers/enrichment/cognism';
import { companiesHouseProvider } from '@/lib/credentials/providers/enrichment/companies-house';
import { exploriumProvider } from '@/lib/credentials/providers/enrichment/explorium';
import { lushaProvider } from '@/lib/credentials/providers/enrichment/lusha';
import { openmartProvider } from '@/lib/credentials/providers/enrichment/openmart';
import { peopleDataLabsProvider } from '@/lib/credentials/providers/enrichment/pdl';
import type {
  EnrichmentInput,
  EnrichmentProviderAdapter,
} from '@/lib/credentials/providers/enrichment/types';

const adapters: Record<EnrichmentProviderId, EnrichmentProviderAdapter> = {
  companies_house: companiesHouseProvider,
  people_data_labs: peopleDataLabsProvider,
  lusha: lushaProvider,
  cognism: cognismProvider,
  openmart: openmartProvider,
  explorium: exploriumProvider,
};

export function getEnrichmentAdapter(provider: EnrichmentProviderId): EnrichmentProviderAdapter {
  return adapters[provider];
}

export function listEnrichmentAdapters(): EnrichmentProviderAdapter[] {
  return Object.values(adapters);
}

export async function verifyEnrichmentCredential(
  provider: EnrichmentProviderId,
  apiKey: string,
  config: Record<string, unknown> = {}
): Promise<VerifyResult> {
  return getEnrichmentAdapter(provider).verify(apiKey, config);
}

export async function enrichViaProvider(
  provider: EnrichmentProviderId,
  apiKey: string,
  config: Record<string, unknown>,
  input: EnrichmentInput
) {
  return getEnrichmentAdapter(provider).enrich(apiKey, config, input);
}

export function enrichmentProviderSupports(
  provider: EnrichmentProviderId,
  scope: 'company' | 'person'
): boolean {
  return getEnrichmentAdapter(provider).scopes.includes(scope);
}
