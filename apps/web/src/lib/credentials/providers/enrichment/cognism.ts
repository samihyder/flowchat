import type { EnrichmentProviderAdapter } from '@/lib/credentials/providers/enrichment/types';
import { enrichmentFetch, pickString } from '@/lib/credentials/providers/enrichment/http';

const BASE = 'https://app.cognism.com/api';

function cognismHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export const cognismProvider: EnrichmentProviderAdapter = {
  id: 'cognism',
  label: 'Cognism',
  scopes: ['company', 'person'],
  hint: 'Cognism API bearer token',

  async verify(apiKey) {
    const { status } = await enrichmentFetch(`${BASE}/search/contact?email=test@example.com`, {
      headers: cognismHeaders(apiKey),
    });
    if (status === 401 || status === 403) {
      return { ok: false, error: 'Invalid Cognism API key' };
    }
    if (status >= 500) return { ok: false, error: 'Cognism API is temporarily unavailable' };
    return { ok: true };
  },

  async enrich(apiKey, _config, input) {
    if (input.scope === 'person' && input.email) {
      const person = await enrichmentFetch(
        `${BASE}/search/contact?email=${encodeURIComponent(input.email)}`,
        { headers: cognismHeaders(apiKey) }
      );
      if (person.status >= 400) {
        return { ok: false, status: person.status, body: person.json };
      }
      const results = (person.json as { results?: Record<string, unknown>[] })?.results ?? [];
      const record = results[0] ?? (person.json as Record<string, unknown>);
      return {
        ok: true,
        scope: 'person',
        person: {
          jobTitle: pickString(record.jobTitle, record.title),
          linkedinUrl: pickString(record.linkedinUrl),
          phone: pickString(record.phone, record.mobile),
          companyName: pickString(record.companyName, record.accountName),
          workEmail: pickString(record.email, record.workEmail),
          personalEmail: pickString(record.personalEmail),
          firstName: pickString(record.firstName),
          lastName: pickString(record.lastName),
        },
        raw: { person: person.json },
      };
    }

    const company = await enrichmentFetch(
      `${BASE}/search/account?domain=${encodeURIComponent(input.domain)}`,
      { headers: cognismHeaders(apiKey) }
    );
    if (company.status >= 400) {
      return { ok: false, status: company.status, body: company.json };
    }
    const results = (company.json as { results?: Record<string, unknown>[] })?.results ?? [];
    const record = results[0] ?? (company.json as Record<string, unknown>);
    const hq = record.headquarters as Record<string, unknown> | undefined;
    return {
      ok: true,
      scope: 'company',
      company: {
        name: pickString(record.name, record.accountName),
        website: pickString(record.website, `https://${input.domain}`),
        hqCity: pickString(hq?.city, record.city),
        hqCountry: pickString(hq?.country, record.country),
        industry: pickString(record.industry),
        linkedinUrl: pickString(record.linkedinUrl),
        phone: pickString(record.phone),
      },
      raw: { company: company.json },
    };
  },
};
