import type { AppSql } from '@/lib/db-sql';
import { scheduleCompanyEnrichment } from '@/lib/companies/enrichment';
import {
  extractCorporateDomain,
  guessCompanyNameFromDomain,
  normalizeDomain,
} from '@/lib/companies/domain';
import type { GlobalCompany, GlobalCompanySummary } from '@/lib/companies/types';

type CompanyRow = {
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
  enrichmentStatus: string;
  enrichmentProvider: string | null;
  enrichmentError: string | null;
  enrichedAt: Date | null;
  firstDiscoveredByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeCompany(row: CompanyRow): GlobalCompany {
  return {
    id: row.id,
    domain: row.domain,
    name: row.name,
    website: row.website,
    logoUrl: row.logoUrl,
    hqCity: row.hqCity,
    hqRegion: row.hqRegion,
    hqCountry: row.hqCountry,
    hqAddress: row.hqAddress,
    industry: row.industry,
    linkedinUrl: row.linkedinUrl,
    phone: row.phone,
    enrichmentStatus: row.enrichmentStatus as GlobalCompany['enrichmentStatus'],
    enrichmentProvider: row.enrichmentProvider,
    enrichmentError: row.enrichmentError,
    enrichedAt: row.enrichedAt ? new Date(row.enrichedAt).toISOString() : null,
    firstDiscoveredByAccountId: row.firstDiscoveredByAccountId,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function toCompanySummary(company: GlobalCompany): GlobalCompanySummary {
  return {
    id: company.id,
    domain: company.domain,
    name: company.name,
    website: company.website,
    logoUrl: company.logoUrl,
    hqCity: company.hqCity,
    hqCountry: company.hqCountry,
    enrichmentStatus: company.enrichmentStatus,
  };
}

export async function getGlobalCompanyById(
  sql: AppSql,
  companyId: string
): Promise<GlobalCompany | null> {
  const rows = await sql`
    SELECT id, domain, name, website, logo_url as "logoUrl",
           hq_city as "hqCity", hq_region as "hqRegion", hq_country as "hqCountry",
           hq_address as "hqAddress", industry, linkedin_url as "linkedinUrl", phone,
           enrichment_status as "enrichmentStatus", enrichment_provider as "enrichmentProvider",
           enrichment_error as "enrichmentError", enriched_at as "enrichedAt",
           first_discovered_by_account_id as "firstDiscoveredByAccountId",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM companies
    WHERE id = ${companyId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as CompanyRow | undefined;
  return row ? serializeCompany(row) : null;
}

export async function getGlobalCompanyByDomain(
  sql: AppSql,
  domain: string
): Promise<GlobalCompany | null> {
  const normalized = normalizeDomain(domain);
  const rows = await sql`
    SELECT id, domain, name, website, logo_url as "logoUrl",
           hq_city as "hqCity", hq_region as "hqRegion", hq_country as "hqCountry",
           hq_address as "hqAddress", industry, linkedin_url as "linkedinUrl", phone,
           enrichment_status as "enrichmentStatus", enrichment_provider as "enrichmentProvider",
           enrichment_error as "enrichmentError", enriched_at as "enrichedAt",
           first_discovered_by_account_id as "firstDiscoveredByAccountId",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM companies
    WHERE lower(domain) = ${normalized}
    LIMIT 1
  `;
  const row = rows[0] as CompanyRow | undefined;
  return row ? serializeCompany(row) : null;
}

/** Find or create a platform-wide company for a corporate email domain. */
export async function getOrCreateGlobalCompany(
  sql: AppSql,
  domain: string,
  discoveredByAccountId?: string | null
): Promise<{ company: GlobalCompany; created: boolean }> {
  const normalized = normalizeDomain(domain);
  const existing = await getGlobalCompanyByDomain(sql, normalized);
  if (existing) return { company: existing, created: false };

  const name = guessCompanyNameFromDomain(normalized);
  const website = `https://${normalized}`;

  const inserted = await sql`
    INSERT INTO companies (
      domain, name, website, first_discovered_by_account_id, enrichment_status
    )
    VALUES (
      ${normalized},
      ${name},
      ${website},
      ${discoveredByAccountId ?? null}::uuid,
      'pending'
    )
    ON CONFLICT (domain) DO NOTHING
    RETURNING id, domain, name, website, logo_url as "logoUrl",
              hq_city as "hqCity", hq_region as "hqRegion", hq_country as "hqCountry",
              hq_address as "hqAddress", industry, linkedin_url as "linkedinUrl", phone,
              enrichment_status as "enrichmentStatus", enrichment_provider as "enrichmentProvider",
              enrichment_error as "enrichmentError", enriched_at as "enrichedAt",
              first_discovered_by_account_id as "firstDiscoveredByAccountId",
              created_at as "createdAt", updated_at as "updatedAt"
  `;

  const createdRow = inserted[0] as CompanyRow | undefined;
  if (createdRow) {
    const company = serializeCompany(createdRow);
    scheduleCompanyEnrichment(company.id, company.domain);
    return { company, created: true };
  }

  const again = await getGlobalCompanyByDomain(sql, normalized);
  if (!again) {
    throw new Error(`Failed to resolve global company for domain ${normalized}`);
  }
  return { company: again, created: false };
}

/** Link a tenant contact to the shared global company for their email domain. */
export async function linkContactToGlobalCompany(
  sql: AppSql,
  contactId: string,
  email: string | null | undefined,
  accountId?: string | null
): Promise<{ companyId: string | null; companyCreated: boolean }> {
  const domain = extractCorporateDomain(email);
  if (!domain) {
    await sql`
      UPDATE contacts SET company_id = NULL, updated_at = NOW()
      WHERE id = ${contactId}::uuid
    `;
    return { companyId: null, companyCreated: false };
  }

  const { company, created } = await getOrCreateGlobalCompany(sql, domain, accountId ?? null);
  await sql`
    UPDATE contacts SET company_id = ${company.id}::uuid, updated_at = NOW()
    WHERE id = ${contactId}::uuid
  `;
  return { companyId: company.id, companyCreated: created };
}
