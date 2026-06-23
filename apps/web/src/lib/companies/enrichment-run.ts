import type { AppSql } from '@/lib/db-sql';
import { extractCorporateDomain } from '@/lib/companies/domain';
import { getGlobalCompanyById, linkContactToGlobalCompany, toCompanySummary } from '@/lib/companies/resolve';
import type { GlobalCompany, GlobalCompanySummary } from '@/lib/companies/types';
import {
  enrichmentError,
  enrichmentErrorFromException,
  enrichmentErrorFromHttp,
  type EnrichmentError,
} from '@/lib/credentials/providers/enrichment/errors';
import {
  enrichViaProvider,
  enrichmentProviderSupports,
  getEnrichmentAdapter,
} from '@/lib/credentials/providers/enrichment/index';
import type { EnrichmentScope } from '@/lib/credentials/providers/enrichment/types';
import { getCredentialSecret, markCredentialUsed } from '@/lib/credentials/store';
import type { EnrichmentProviderId } from '@/lib/credentials/types';

export type EnrichmentRunInput = {
  accountId: string;
  contactId: string;
  credentialId: string;
  scope?: EnrichmentScope | 'auto';
};

export type EnrichmentRunSuccess = {
  ok: true;
  scope: EnrichmentScope | 'both';
  company: GlobalCompanySummary | null;
  person: {
    jobTitle: string | null;
    linkedinUrl: string | null;
    phone: string | null;
    companyName: string | null;
  } | null;
  enrichmentStatus: 'enriched' | 'partial';
};

function hasCompanyFields(fields: Record<string, unknown>): boolean {
  return Object.values(fields).some((v) => v != null && v !== '');
}

function mergeCompanyPatch(
  existing: GlobalCompany,
  patch: Record<string, string | null | undefined>
): { status: 'enriched' | 'partial'; fields: Record<string, string | null> } {
  const merged: Record<string, string | null> = {};
  let filled = 0;
  let attempted = 0;
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '') continue;
    attempted++;
    const current = (existing as unknown as Record<string, unknown>)[key];
    if (current == null || current === '') {
      merged[key] = value;
      filled++;
    }
  }
  const status = attempted > 0 && filled < attempted ? 'partial' : filled > 0 ? 'enriched' : 'partial';
  return { status, fields: merged };
}

export async function runContactEnrichment(
  sql: AppSql,
  input: EnrichmentRunInput
): Promise<EnrichmentRunSuccess | EnrichmentError> {
  const cred = await getCredentialSecret(sql, input.accountId, input.credentialId);
  if (!cred) {
    return enrichmentError('credential_not_found');
  }
  if (cred.row.category !== 'data_enrichment') {
    return enrichmentError('provider_mismatch');
  }
  if (cred.row.status !== 'active') {
    return enrichmentError('credential_inactive', {
      provider: cred.row.provider as EnrichmentProviderId,
    });
  }

  const provider = cred.row.provider as EnrichmentProviderId;
  const adapter = getEnrichmentAdapter(provider);

  const contactRows = await sql`
    SELECT id, name, email, phone, company_id as "companyId"
    FROM contacts
    WHERE id = ${input.contactId}::uuid AND account_id = ${input.accountId}::uuid
    LIMIT 1
  `;
  const contact = contactRows[0] as
    | { id: string; name: string; email: string | null; phone: string | null; companyId: string | null }
    | undefined;
  if (!contact) {
    return enrichmentError('invalid_request', { detail: 'Contact not found' });
  }

  const domain = extractCorporateDomain(contact.email);
  if (!domain) {
    return enrichmentError('no_corporate_domain');
  }

  let companyId = contact.companyId;
  if (!companyId) {
    const linked = await linkContactToGlobalCompany(sql, contact.id, contact.email, input.accountId);
    companyId = linked.companyId;
  }
  if (!companyId) {
    return enrichmentError('company_not_linked');
  }

  const company = await getGlobalCompanyById(sql, companyId);
  if (!company) {
    return enrichmentError('company_not_linked');
  }

  let scope: EnrichmentScope =
    input.scope && input.scope !== 'auto' ? input.scope : 'company';
  if (scope === 'person' && !enrichmentProviderSupports(provider, 'person')) {
    return enrichmentError('unsupported_scope', { provider });
  }
  if (scope === 'company' && !enrichmentProviderSupports(provider, 'company')) {
    return enrichmentError('unsupported_scope', { provider });
  }
  if (input.scope === 'auto' && contact.email && enrichmentProviderSupports(provider, 'person')) {
    scope = 'person';
  }

  let adapterResult;
  try {
    adapterResult = await enrichViaProvider(provider, cred.secret, cred.row.config, {
      domain,
      companyName: company.name,
      email: contact.email,
      contactName: contact.name,
      scope,
    });
  } catch (err) {
    console.error('[enrichment] provider call failed', {
      provider,
      contactId: input.contactId,
      detail: err instanceof Error ? err.message : err,
    });
    return enrichmentErrorFromException(provider, err);
  }

  if (!adapterResult.ok) {
    console.error('[enrichment] provider error', {
      provider,
      contactId: input.contactId,
      status: adapterResult.status,
    });
    return enrichmentErrorFromHttp(provider, adapterResult.status, adapterResult.body);
  }

  await markCredentialUsed(sql, input.credentialId);

  let companySummary: GlobalCompanySummary | null = null;
  let enrichmentStatus: 'enriched' | 'partial' = 'partial';
  let personResult: EnrichmentRunSuccess['person'] = null;

  if (adapterResult.company && enrichmentProviderSupports(provider, 'company')) {
    const patch = {
      name: adapterResult.company.name ?? undefined,
      website: adapterResult.company.website ?? undefined,
      logoUrl: adapterResult.company.logoUrl ?? undefined,
      hqCity: adapterResult.company.hqCity ?? undefined,
      hqRegion: adapterResult.company.hqRegion ?? undefined,
      hqCountry: adapterResult.company.hqCountry ?? undefined,
      hqAddress: adapterResult.company.hqAddress ?? undefined,
      industry: adapterResult.company.industry ?? undefined,
      linkedinUrl: adapterResult.company.linkedinUrl ?? undefined,
      phone: adapterResult.company.phone ?? undefined,
    };
    const { status, fields } = mergeCompanyPatch(company, patch);
    enrichmentStatus = status;

    if (hasCompanyFields(fields)) {
      await sql`
        UPDATE companies SET
          name = COALESCE(${fields.name ?? null}, name),
          website = COALESCE(${fields.website ?? null}, website),
          logo_url = COALESCE(${fields.logoUrl ?? null}, logo_url),
          hq_city = COALESCE(${fields.hqCity ?? null}, hq_city),
          hq_region = COALESCE(${fields.hqRegion ?? null}, hq_region),
          hq_country = COALESCE(${fields.hqCountry ?? null}, hq_country),
          hq_address = COALESCE(${fields.hqAddress ?? null}, hq_address),
          industry = COALESCE(${fields.industry ?? null}, industry),
          linkedin_url = COALESCE(${fields.linkedinUrl ?? null}, linkedin_url),
          phone = COALESCE(${fields.phone ?? null}, phone),
          enrichment_status = ${status},
          enrichment_provider = ${provider},
          enrichment_error = NULL,
          enriched_at = NOW(),
          raw_enrichment = raw_enrichment || ${JSON.stringify({ [provider]: adapterResult.raw })}::jsonb,
          updated_at = NOW()
        WHERE id = ${companyId}::uuid
      `;
    } else if (hasCompanyFields(patch as Record<string, unknown>)) {
      await sql`
        UPDATE companies SET
          enrichment_status = 'partial',
          enrichment_provider = ${provider},
          enrichment_error = NULL,
          enriched_at = NOW(),
          raw_enrichment = raw_enrichment || ${JSON.stringify({ [provider]: adapterResult.raw })}::jsonb,
          updated_at = NOW()
        WHERE id = ${companyId}::uuid
      `;
    }

    const updated = await getGlobalCompanyById(sql, companyId);
    companySummary = updated ? toCompanySummary(updated) : toCompanySummary(company);
  }

  if (adapterResult.person) {
    personResult = {
      jobTitle: adapterResult.person.jobTitle ?? null,
      linkedinUrl: adapterResult.person.linkedinUrl ?? null,
      phone: adapterResult.person.phone ?? null,
      companyName: adapterResult.person.companyName ?? null,
    };

    const personStatus =
      personResult.jobTitle || personResult.linkedinUrl || personResult.phone ? 'enriched' : 'partial';
    if (personStatus === 'enriched') enrichmentStatus = 'enriched';

    const phoneUpdate = adapterResult.person.phone && !contact.phone ? adapterResult.person.phone : null;
    await sql`
      UPDATE contacts SET
        phone = COALESCE(${phoneUpdate}, phone),
        enrichment_status = ${personStatus},
        enrichment_provider = ${provider},
        enriched_at = NOW(),
        custom_attributes = COALESCE(custom_attributes, '{}'::jsonb) || ${JSON.stringify({
          __flowchat_enrichment: {
            provider,
            at: new Date().toISOString(),
            person: personResult,
          },
        })}::jsonb,
        updated_at = NOW()
      WHERE id = ${contact.id}::uuid
    `;
  }

  return {
    ok: true,
    scope: adapterResult.scope,
    company: companySummary,
    person: personResult,
    enrichmentStatus,
  };
}
