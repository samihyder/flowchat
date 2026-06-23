import type { EnrichmentProviderAdapter } from '@/lib/credentials/providers/enrichment/types';
import { enrichmentFetch, pickString } from '@/lib/credentials/providers/enrichment/http';

const COMPANY_URL = 'https://api.peopledatalabs.com/v5/company/enrich';
const PERSON_URL = 'https://api.peopledatalabs.com/v5/person/enrich';

export const peopleDataLabsProvider: EnrichmentProviderAdapter = {
  id: 'people_data_labs',
  label: 'People Data Labs',
  scopes: ['company', 'person'],
  hint: 'PDL API key (X-Api-Key)',

  async verify(apiKey) {
    const { status } = await enrichmentFetch(`${COMPANY_URL}?website=example.com`, {
      headers: { 'X-Api-Key': apiKey, accept: 'application/json' },
    });
    if (status === 401) return { ok: false, error: 'Invalid People Data Labs API key' };
    if (status >= 500) return { ok: false, error: 'People Data Labs API is temporarily unavailable' };
    return { ok: true };
  },

  async enrich(apiKey, _config, input) {
    if (input.scope === 'person' && input.email) {
      const person = await enrichmentFetch(
        `${PERSON_URL}?email=${encodeURIComponent(input.email)}`,
        { headers: { 'X-Api-Key': apiKey, accept: 'application/json' } }
      );
      if (person.status >= 400) {
        return { ok: false, status: person.status, body: person.json };
      }
      const data = (person.json as { data?: Record<string, unknown> })?.data ?? {};
      const job = data.job_title ?? data.job_title_role;
      return {
        ok: true,
        scope: 'person',
        person: {
          jobTitle: pickString(job),
          linkedinUrl: pickString(data.linkedin_url),
          phone: pickString(data.phone_numbers),
          companyName: pickString(data.job_company_name),
        },
        raw: { person: person.json },
      };
    }

    const company = await enrichmentFetch(
      `${COMPANY_URL}?website=${encodeURIComponent(input.domain)}`,
      { headers: { 'X-Api-Key': apiKey, accept: 'application/json' } }
    );
    if (company.status >= 400) {
      return { ok: false, status: company.status, body: company.json };
    }
    const data = (company.json as { data?: Record<string, unknown> })?.data ?? {};
    return {
      ok: true,
      scope: 'company',
      company: {
        name: pickString(data.name),
        website: pickString(data.website, `https://${input.domain}`),
        logoUrl: pickString(data.logo_url),
        hqCity: pickString((data.location as Record<string, unknown>)?.locality),
        hqRegion: pickString((data.location as Record<string, unknown>)?.region),
        hqCountry: pickString((data.location as Record<string, unknown>)?.country),
        industry: pickString(data.industry),
        linkedinUrl: pickString(data.linkedin_url),
        phone: pickString(data.phone),
      },
      raw: { company: company.json },
    };
  },
};
