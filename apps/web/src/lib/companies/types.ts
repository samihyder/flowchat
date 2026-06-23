export type CompanyEnrichmentStatus = 'pending' | 'enriched' | 'partial' | 'failed';

export type GlobalCompany = {
  id: string;
  domain: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  hqCity: string | null;
  hqRegion: string | null;
  hqCountry: string | null;
  hqAddress: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  enrichmentStatus: CompanyEnrichmentStatus;
  enrichmentProvider: string | null;
  enrichmentError: string | null;
  enrichedAt: string | null;
  firstDiscoveredByAccountId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GlobalCompanySummary = Pick<
  GlobalCompany,
  'id' | 'domain' | 'name' | 'website' | 'logoUrl' | 'hqCity' | 'hqCountry' | 'enrichmentStatus'
>;
