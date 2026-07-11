import type { EnrichmentProviderAdapter } from '@/lib/credentials/providers/enrichment/types';
import { enrichmentFetch, pickString } from '@/lib/credentials/providers/enrichment/http';

const BASE = 'https://api.lusha.com';

function lushaHeaders(apiKey: string) {
  return {
    api_key: apiKey,
    accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export const lushaProvider: EnrichmentProviderAdapter = {
  id: 'lusha',
  label: 'Lusha',
  scopes: ['company', 'person'],
  hint: 'Lusha API key',

  async verify(apiKey) {
    const { status } = await enrichmentFetch(`${BASE}/v2/person?email=test@example.com`, {
      headers: lushaHeaders(apiKey),
    });
    if (status === 401 || status === 403) {
      return { ok: false, error: 'Invalid Lusha API key' };
    }
    if (status >= 500) return { ok: false, error: 'Lusha API is temporarily unavailable' };
    return { ok: true };
  },

  async enrich(apiKey, _config, input) {
    if (input.scope === 'person' && input.email) {
      const person = await enrichmentFetch(
        `${BASE}/v2/person?email=${encodeURIComponent(input.email)}`,
        { headers: lushaHeaders(apiKey) }
      );
      if (person.status >= 400) {
        return { ok: false, status: person.status, body: person.json };
      }
      const data = (person.json as { data?: Record<string, unknown> })?.data ?? person.json;
      const record = (data as Record<string, unknown>) ?? {};
      return {
        ok: true,
        scope: 'person',
        person: {
          jobTitle: pickString(record.jobTitle, record.title),
          linkedinUrl: pickString(record.linkedinUrl, record.socialLinks),
          phone: pickString(record.phone, record.phoneNumber),
          companyName: pickString(record.companyName, record.company),
          workEmail: pickString(record.email, record.workEmail),
          personalEmail: pickString(record.personalEmail),
          firstName: pickString(record.firstName),
          lastName: pickString(record.lastName),
        },
        raw: { person: person.json },
      };
    }

    const company = await enrichmentFetch(
      `${BASE}/v2/company?domain=${encodeURIComponent(input.domain)}`,
      { headers: lushaHeaders(apiKey) }
    );
    if (company.status >= 400) {
      return { ok: false, status: company.status, body: company.json };
    }
    const data = (company.json as { data?: Record<string, unknown> })?.data ?? company.json;
    const record = (data as Record<string, unknown>) ?? {};
    return {
      ok: true,
      scope: 'company',
      company: {
        name: pickString(record.name, record.companyName),
        website: pickString(record.website, `https://${input.domain}`),
        logoUrl: pickString(record.logo, record.logoUrl),
        hqCity: pickString(record.city),
        hqCountry: pickString(record.country),
        industry: pickString(record.industry),
        linkedinUrl: pickString(record.linkedinUrl),
        phone: pickString(record.phone),
      },
      raw: { company: company.json },
    };
  },
};
