import type { AppSql } from '@/lib/db-sql';
import { extractCorporateDomain } from '@/lib/companies/domain';
import {
  buildSuggestionFields,
  createEnrichmentSuggestion,
  type EnrichmentSuggestion,
} from '@/lib/companies/enrichment-suggestions';
import { getGlobalCompanyById, linkContactToGlobalCompany } from '@/lib/companies/resolve';
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
  /** When set, only include these suggestion field keys (post-build filter). */
  allowedFieldKeys?: string[];
};

export type EnrichmentRunSuccess = {
  ok: true;
  scope: EnrichmentScope | 'both';
  suggestion: EnrichmentSuggestion;
  fieldCount: number;
};

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
  getEnrichmentAdapter(provider);

  const contactRows = await sql`
    SELECT id, name, email, phone, company_id as "companyId", custom_attributes as "customAttributes"
    FROM contacts
    WHERE id = ${input.contactId}::uuid AND account_id = ${input.accountId}::uuid
    LIMIT 1
  `;
  const contact = contactRows[0] as
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        companyId: string | null;
        customAttributes: Record<string, unknown>;
      }
    | undefined;
  if (!contact) {
    return enrichmentError('invalid_request', { detail: 'Contact not found' });
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

  const domain = contact.email ? extractCorporateDomain(contact.email) : null;
  const personOnly = scope === 'person' && !domain;

  if (!personOnly && !domain) {
    return enrichmentError('no_corporate_domain');
  }

  let companyId = contact.companyId;
  if (!companyId && domain && contact.email) {
    const linked = await linkContactToGlobalCompany(sql, contact.id, contact.email, input.accountId);
    companyId = linked.companyId;
  }
  if (!personOnly && !companyId) {
    return enrichmentError('company_not_linked');
  }

  const company = companyId ? await getGlobalCompanyById(sql, companyId) : null;
  if (!personOnly && !company) {
    return enrichmentError('company_not_linked');
  }

  let adapterResult;
  try {
    adapterResult = await enrichViaProvider(provider, cred.secret, cred.row.config, {
      domain: domain ?? 'example.com',
      companyName: company?.name ?? contact.name,
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

  let fields = buildSuggestionFields({
    provider,
    contact: { phone: contact.phone, email: contact.email, name: contact.name },
    company,
    companyFields:
      adapterResult.company && enrichmentProviderSupports(provider, 'company')
        ? adapterResult.company
        : null,
    personFields: adapterResult.person ?? null,
  });

  if (input.allowedFieldKeys && input.allowedFieldKeys.length > 0) {
    const allowed = new Set(input.allowedFieldKeys);
    fields = fields.filter((f) => allowed.has(f.key));
  }

  if (fields.length === 0) {
    return enrichmentError('not_found', { provider });
  }

  const suggestion = await createEnrichmentSuggestion(sql, {
    accountId: input.accountId,
    contactId: input.contactId,
    companyId,
    credentialId: input.credentialId,
    provider,
    scope: adapterResult.scope,
    fields,
    rawPayload: adapterResult.raw,
  });

  return {
    ok: true,
    scope: adapterResult.scope,
    suggestion,
    fieldCount: fields.length,
  };
}
