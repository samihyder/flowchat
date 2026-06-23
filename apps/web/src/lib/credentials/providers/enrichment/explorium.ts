import type { EnrichmentProviderAdapter } from '@/lib/credentials/providers/enrichment/types';
import { enrichmentFetch, pickString } from '@/lib/credentials/providers/enrichment/http';

const DEFAULT_BASE = 'https://api.explorium.ai/v1';

function baseUrl(config: Record<string, unknown>): string {
  const custom = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : '';
  return custom || DEFAULT_BASE;
}

export const exploriumProvider: EnrichmentProviderAdapter = {
  id: 'explorium',
  label: 'Explorium',
  scopes: ['company'],
  hint: 'Explorium API key',

  async verify(apiKey, config) {
    const { status } = await enrichmentFetch(`${baseUrl(config)}/companies/enrich`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: 'example.com' }),
    });
    if (status === 401 || status === 403) {
      return { ok: false, error: 'Invalid Explorium API key' };
    }
    if (status >= 500) return { ok: false, error: 'Explorium API is temporarily unavailable' };
    return { ok: true };
  },

  async enrich(apiKey, config, input) {
    const res = await enrichmentFetch(`${baseUrl(config)}/companies/enrich`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: input.domain, name: input.companyName ?? undefined }),
    });
    if (res.status >= 400) {
      return { ok: false, status: res.status, body: res.json };
    }
    const data = (res.json as { data?: Record<string, unknown> })?.data ?? (res.json as Record<string, unknown>);
    const hq = data.headquarters as Record<string, unknown> | undefined;
    return {
      ok: true,
      scope: 'company',
      company: {
        name: pickString(data.name, data.company_name),
        website: pickString(data.website, `https://${input.domain}`),
        logoUrl: pickString(data.logo_url, data.logo),
        hqCity: pickString(hq?.city, data.city),
        hqRegion: pickString(hq?.region, data.region),
        hqCountry: pickString(hq?.country, data.country),
        industry: pickString(data.industry),
        linkedinUrl: pickString(data.linkedin_url),
        phone: pickString(data.phone),
      },
      raw: { company: res.json },
    };
  },
};
