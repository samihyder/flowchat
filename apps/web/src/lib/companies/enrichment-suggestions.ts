import type { AppSql } from '@/lib/db-sql';
import { getGlobalCompanyById, toCompanySummary } from '@/lib/companies/resolve';
import type { GlobalCompany, GlobalCompanySummary } from '@/lib/companies/types';
import { providerLabel } from '@/lib/credentials/providers/enrichment/errors';
import type {
  EnrichmentCompanyFields,
  EnrichmentPersonFields,
} from '@/lib/credentials/providers/enrichment/types';
import type { EnrichmentProviderId } from '@/lib/credentials/types';

export type EnrichmentSuggestionField = {
  key: string;
  label: string;
  entity: 'contact' | 'company' | 'person';
  current: string | null;
  proposed: string;
  source: string;
};

export type EnrichmentSuggestion = {
  id: string;
  provider: string;
  providerLabel: string;
  scope: 'company' | 'person' | 'both';
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  fields: EnrichmentSuggestionField[];
  fetchedAt: string;
  expiresAt: string;
};

const FIELD_LABELS: Record<string, string> = {
  'contact.phone': 'Phone',
  'contact.email': 'Corporate email',
  'contact.personalEmail': 'Personal email',
  'contact.firstName': 'First name',
  'contact.lastName': 'Last name',
  'person.jobTitle': 'Job title',
  'person.linkedinUrl': 'LinkedIn',
  'person.companyName': 'Company name',
  'company.name': 'Company name',
  'company.website': 'Website',
  'company.logoUrl': 'Logo URL',
  'company.hqCity': 'HQ city',
  'company.hqRegion': 'HQ region',
  'company.hqCountry': 'HQ country',
  'company.hqAddress': 'HQ address',
  'company.industry': 'Industry',
  'company.linkedinUrl': 'Company LinkedIn',
  'company.phone': 'Company phone',
};

function norm(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t || null;
}

function addField(
  out: EnrichmentSuggestionField[],
  key: string,
  entity: EnrichmentSuggestionField['entity'],
  current: string | null,
  proposed: string | null | undefined,
  source: string
) {
  const p = norm(proposed);
  if (!p) return;
  const c = norm(current);
  if (c === p) return;
  out.push({
    key,
    label: FIELD_LABELS[key] ?? key,
    entity,
    current: c,
    proposed: p,
    source,
  });
}

export function buildSuggestionFields(input: {
  provider: EnrichmentProviderId;
  contact: { phone: string | null; email?: string | null; name?: string };
  company: GlobalCompany | null;
  companyFields?: EnrichmentCompanyFields | null;
  personFields?: EnrichmentPersonFields | null;
}): EnrichmentSuggestionField[] {
  const source = providerLabel(input.provider);
  const fields: EnrichmentSuggestionField[] = [];

  if (input.personFields) {
    const p = input.personFields;
    addField(fields, 'contact.phone', 'contact', input.contact.phone, p.phone, source);
    addField(fields, 'contact.email', 'contact', null, p.workEmail, source);
    addField(fields, 'contact.personalEmail', 'contact', null, p.personalEmail, source);
    addField(fields, 'contact.firstName', 'contact', null, p.firstName, source);
    addField(fields, 'contact.lastName', 'contact', null, p.lastName, source);
    addField(fields, 'person.jobTitle', 'person', null, p.jobTitle, source);
    addField(fields, 'person.linkedinUrl', 'person', null, p.linkedinUrl, source);
    addField(fields, 'person.companyName', 'person', null, p.companyName, source);
  }

  if (input.companyFields && input.company) {
    const c = input.company;
    const f = input.companyFields;
    addField(fields, 'company.name', 'company', c.name, f.name, source);
    addField(fields, 'company.website', 'company', c.website, f.website, source);
    addField(fields, 'company.logoUrl', 'company', c.logoUrl, f.logoUrl, source);
    addField(fields, 'company.hqCity', 'company', c.hqCity, f.hqCity, source);
    addField(fields, 'company.hqRegion', 'company', c.hqRegion, f.hqRegion, source);
    addField(fields, 'company.hqCountry', 'company', c.hqCountry, f.hqCountry, source);
    addField(fields, 'company.hqAddress', 'company', c.hqAddress, f.hqAddress, source);
    addField(fields, 'company.industry', 'company', c.industry, f.industry, source);
    addField(fields, 'company.linkedinUrl', 'company', c.linkedinUrl, f.linkedinUrl, source);
    addField(fields, 'company.phone', 'company', c.phone, f.phone, source);
  }

  return fields;
}

type DbSuggestion = {
  id: string;
  provider: string;
  scope: string;
  status: string;
  fields: EnrichmentSuggestionField[];
  fetchedAt: Date;
  expiresAt: Date;
};

function serialize(row: DbSuggestion): EnrichmentSuggestion {
  return {
    id: row.id,
    provider: row.provider,
    providerLabel: providerLabel(row.provider as EnrichmentProviderId),
    scope: row.scope as EnrichmentSuggestion['scope'],
    status: row.status as EnrichmentSuggestion['status'],
    fields: Array.isArray(row.fields) ? row.fields : [],
    fetchedAt: new Date(row.fetchedAt).toISOString(),
    expiresAt: new Date(row.expiresAt).toISOString(),
  };
}

export async function expirePendingSuggestions(sql: AppSql, accountId: string, contactId: string) {
  await sql`
    UPDATE contact_enrichment_suggestions
    SET status = 'expired', updated_at = NOW()
    WHERE account_id = ${accountId}::uuid
      AND contact_id = ${contactId}::uuid
      AND status = 'pending'
  `;
}

export async function createEnrichmentSuggestion(
  sql: AppSql,
  input: {
    accountId: string;
    contactId: string;
    companyId: string | null;
    credentialId: string;
    provider: EnrichmentProviderId;
    scope: 'company' | 'person' | 'both';
    fields: EnrichmentSuggestionField[];
    rawPayload: Record<string, unknown>;
  }
): Promise<EnrichmentSuggestion> {
  await expirePendingSuggestions(sql, input.accountId, input.contactId);

  const rows = await sql`
    INSERT INTO contact_enrichment_suggestions (
      account_id, contact_id, company_id, credential_id,
      provider, scope, fields, raw_payload
    )
    VALUES (
      ${input.accountId}::uuid,
      ${input.contactId}::uuid,
      ${input.companyId}::uuid,
      ${input.credentialId}::uuid,
      ${input.provider},
      ${input.scope},
      ${JSON.stringify(input.fields)}::jsonb,
      ${JSON.stringify(input.rawPayload)}::jsonb
    )
    RETURNING id, provider, scope, status,
              fields, fetched_at as "fetchedAt", expires_at as "expiresAt"
  `;

  return serialize(rows[0] as DbSuggestion);
}

export async function listPendingSuggestions(
  sql: AppSql,
  accountId: string,
  contactId: string
): Promise<EnrichmentSuggestion[]> {
  await sql`
    UPDATE contact_enrichment_suggestions
    SET status = 'expired', updated_at = NOW()
    WHERE account_id = ${accountId}::uuid
      AND contact_id = ${contactId}::uuid
      AND status = 'pending'
      AND expires_at < NOW()
  `;

  const rows = await sql`
    SELECT id, provider, scope, status, fields,
           fetched_at as "fetchedAt", expires_at as "expiresAt"
    FROM contact_enrichment_suggestions
    WHERE account_id = ${accountId}::uuid
      AND contact_id = ${contactId}::uuid
      AND status = 'pending'
    ORDER BY fetched_at DESC
  `;

  return (rows as DbSuggestion[]).map(serialize);
}

export async function dismissSuggestion(
  sql: AppSql,
  accountId: string,
  contactId: string,
  suggestionId: string
): Promise<boolean> {
  const rows = await sql`
    UPDATE contact_enrichment_suggestions
    SET status = 'dismissed', updated_at = NOW()
    WHERE id = ${suggestionId}::uuid
      AND account_id = ${accountId}::uuid
      AND contact_id = ${contactId}::uuid
      AND status = 'pending'
    RETURNING id
  `;
  return Boolean(rows[0]);
}

export async function applySuggestionFields(
  sql: AppSql,
  input: {
    accountId: string;
    contactId: string;
    suggestionId: string;
    fieldKeys: string[];
    appliedBy: string;
  }
): Promise<{ company: GlobalCompanySummary | null; appliedCount: number }> {
  const rows = await sql`
    SELECT id, company_id as "companyId", provider, fields, status
    FROM contact_enrichment_suggestions
    WHERE id = ${input.suggestionId}::uuid
      AND account_id = ${input.accountId}::uuid
      AND contact_id = ${input.contactId}::uuid
      AND status = 'pending'
    LIMIT 1
  `;
  const suggestion = rows[0] as
    | {
        id: string;
        companyId: string | null;
        provider: string;
        fields: EnrichmentSuggestionField[];
        status: string;
      }
    | undefined;
  if (!suggestion) {
    throw new Error('Suggestion not found or already handled');
  }

  const selected = new Set(input.fieldKeys);
  const toApply = (Array.isArray(suggestion.fields) ? suggestion.fields : []).filter((f) =>
    selected.has(f.key)
  );
  if (toApply.length === 0) {
    throw new Error('Select at least one field to apply');
  }

  const contactRows = await sql`
    SELECT id, phone, email, name, custom_attributes as "customAttributes", company_id as "companyId"
    FROM contacts
    WHERE id = ${input.contactId}::uuid AND account_id = ${input.accountId}::uuid
    LIMIT 1
  `;
  const contact = contactRows[0] as
    | {
        id: string;
        phone: string | null;
        email: string | null;
        name: string;
        customAttributes: Record<string, unknown>;
        companyId: string | null;
      }
    | undefined;
  if (!contact) throw new Error('Contact not found');

  const companyPatch: Record<string, string | null> = {};
  let phoneUpdate: string | null = null;
  let emailUpdate: string | null = null;
  let nameUpdate: string | null = null;
  const personAttrs: Record<string, string> = {};

  for (const field of toApply) {
    if (field.key === 'contact.phone') phoneUpdate = field.proposed;
    else if (field.key === 'contact.email') emailUpdate = field.proposed;
    else if (field.key === 'contact.firstName' || field.key === 'contact.lastName') {
      personAttrs[field.key.replace('contact.', '')] = field.proposed;
    } else if (field.key === 'contact.personalEmail') personAttrs.personal_email = field.proposed;
    else if (field.key === 'person.jobTitle') personAttrs.job_title = field.proposed;
    else if (field.key === 'person.linkedinUrl') personAttrs.linkedin_url = field.proposed;
    else if (field.key === 'person.companyName') personAttrs.enriched_company_name = field.proposed;
    else if (field.key.startsWith('company.')) {
      const col = field.key.replace('company.', '');
      const map: Record<string, string> = {
        name: 'name',
        website: 'website',
        logoUrl: 'logoUrl',
        hqCity: 'hqCity',
        hqRegion: 'hqRegion',
        hqCountry: 'hqCountry',
        hqAddress: 'hqAddress',
        industry: 'industry',
        linkedinUrl: 'linkedinUrl',
        phone: 'phone',
      };
      const k = map[col];
      if (k) companyPatch[k] = field.proposed;
    }
  }

  if (personAttrs.firstName || personAttrs.lastName) {
    const first = personAttrs.firstName ?? contact.name.split(/\s+/)[0] ?? '';
    const last = personAttrs.lastName ?? contact.name.split(/\s+/).slice(1).join(' ');
    nameUpdate = `${first} ${last}`.trim();
    delete personAttrs.firstName;
    delete personAttrs.lastName;
  }

  if (phoneUpdate || emailUpdate || nameUpdate) {
    await sql`
      UPDATE contacts SET
        phone = COALESCE(${phoneUpdate}, phone),
        email = COALESCE(${emailUpdate}, email),
        name = COALESCE(${nameUpdate}, name),
        updated_at = NOW()
      WHERE id = ${contact.id}::uuid
    `;
  }

  if (Object.keys(personAttrs).length > 0) {
    const merged = {
      ...(contact.customAttributes ?? {}),
      ...personAttrs,
      __flowchat_enrichment_applied: {
        provider: suggestion.provider,
        at: new Date().toISOString(),
        fields: Object.keys(personAttrs),
      },
    };
    await sql`
      UPDATE contacts SET
        custom_attributes = ${JSON.stringify(merged)}::jsonb,
        enrichment_status = 'enriched',
        enrichment_provider = ${suggestion.provider},
        enriched_at = NOW(),
        updated_at = NOW()
      WHERE id = ${contact.id}::uuid
    `;
  } else if (phoneUpdate || emailUpdate || nameUpdate) {
    await sql`
      UPDATE contacts SET
        enrichment_status = 'enriched',
        enrichment_provider = ${suggestion.provider},
        enriched_at = NOW()
      WHERE id = ${contact.id}::uuid
    `;
  }

  const companyId = suggestion.companyId ?? contact.companyId;
  if (companyId && Object.keys(companyPatch).length > 0) {
    await sql`
      UPDATE companies SET
        name = COALESCE(${companyPatch.name ?? null}, name),
        website = COALESCE(${companyPatch.website ?? null}, website),
        logo_url = COALESCE(${companyPatch.logoUrl ?? null}, logo_url),
        hq_city = COALESCE(${companyPatch.hqCity ?? null}, hq_city),
        hq_region = COALESCE(${companyPatch.hqRegion ?? null}, hq_region),
        hq_country = COALESCE(${companyPatch.hqCountry ?? null}, hq_country),
        hq_address = COALESCE(${companyPatch.hqAddress ?? null}, hq_address),
        industry = COALESCE(${companyPatch.industry ?? null}, industry),
        linkedin_url = COALESCE(${companyPatch.linkedinUrl ?? null}, linkedin_url),
        phone = COALESCE(${companyPatch.phone ?? null}, phone),
        enrichment_status = 'enriched',
        enrichment_provider = ${suggestion.provider},
        enrichment_error = NULL,
        enriched_at = NOW(),
        updated_at = NOW()
      WHERE id = ${companyId}::uuid
    `;
  }

  await sql`
    UPDATE contact_enrichment_suggestions
    SET status = 'applied', applied_at = NOW(), applied_by = ${input.appliedBy}::uuid, updated_at = NOW()
    WHERE id = ${suggestion.id}::uuid
  `;

  const company = companyId ? await getGlobalCompanyById(sql, companyId) : null;
  return {
    company: company ? toCompanySummary(company) : null,
    appliedCount: toApply.length,
  };
}
