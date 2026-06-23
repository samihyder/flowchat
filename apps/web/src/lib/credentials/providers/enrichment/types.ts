import type { EnrichmentProviderId, VerifyResult } from '@/lib/credentials/types';

export type EnrichmentScope = 'company' | 'person';

export type EnrichmentInput = {
  domain: string;
  companyName?: string | null;
  email?: string | null;
  contactName?: string | null;
  scope: EnrichmentScope;
};

export type EnrichmentCompanyFields = {
  name?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  hqCity?: string | null;
  hqRegion?: string | null;
  hqCountry?: string | null;
  hqAddress?: string | null;
  industry?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
};

export type EnrichmentPersonFields = {
  jobTitle?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  companyName?: string | null;
};

export type EnrichmentAdapterResult =
  | {
      ok: true;
      scope: EnrichmentScope | 'both';
      company?: EnrichmentCompanyFields;
      person?: EnrichmentPersonFields;
      raw: Record<string, unknown>;
    }
  | { ok: false; status: number; body: unknown };

export type EnrichmentProviderAdapter = {
  id: EnrichmentProviderId;
  label: string;
  scopes: EnrichmentScope[];
  hint: string;
  verify: (apiKey: string, config: Record<string, unknown>) => Promise<VerifyResult>;
  enrich: (
    apiKey: string,
    config: Record<string, unknown>,
    input: EnrichmentInput
  ) => Promise<EnrichmentAdapterResult>;
};
