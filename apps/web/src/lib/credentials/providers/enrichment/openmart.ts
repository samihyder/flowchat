import type { EnrichmentProviderAdapter } from '@/lib/credentials/providers/enrichment/types';
import { enrichmentFetch, pickString } from '@/lib/credentials/providers/enrichment/http';

const DEFAULT_BASE = 'https://api.openmart.ai/v1';

function baseUrl(config: Record<string, unknown>): string {
  const custom = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : '';
  return custom || DEFAULT_BASE;
}

export const openmartProvider: EnrichmentProviderAdapter = {
  id: 'openmart',
  label: 'OpenMart',
  scopes: ['company'],
  hint: 'OpenMart API key (optional base URL in config)',

  async verify(apiKey, config) {
    const { status } = await enrichmentFetch(`${baseUrl(config)}/company/enrich?domain=example.com`, {
      headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
    });
    if (status === 401 || status === 403) {
      return { ok: false, error: 'Invalid OpenMart API key' };
    }
    if (status >= 500) return { ok: false, error: 'OpenMart API is temporarily unavailable' };
    return { ok: true };
  },

  async enrich(apiKey, config, input) {
    const res = await enrichmentFetch(
      `${baseUrl(config)}/company/enrich?domain=${encodeURIComponent(input.domain)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' } }
    );
    if (res.status >= 400) {
      return { ok: false, status: res.status, body: res.json };
    }
    const data = (res.json as { data?: Record<string, unknown> })?.data ?? (res.json as Record<string, unknown>);
    return {
      ok: true,
      scope: 'company',
      company: {
        name: pickString(data.name, data.company_name),
        website: pickString(data.website, `https://${input.domain}`),
        logoUrl: pickString(data.logo_url, data.logo),
        hqCity: pickString(data.city, (data.location as Record<string, unknown>)?.city),
        hqCountry: pickString(data.country, (data.location as Record<string, unknown>)?.country),
        industry: pickString(data.industry),
        linkedinUrl: pickString(data.linkedin_url),
        phone: pickString(data.phone),
      },
      raw: { company: res.json },
    };
  },
};
