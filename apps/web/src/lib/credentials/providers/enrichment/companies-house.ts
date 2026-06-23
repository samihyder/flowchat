import type { EnrichmentProviderAdapter } from '@/lib/credentials/providers/enrichment/types';
import { basicAuthHeader, enrichmentFetch, pickString } from '@/lib/credentials/providers/enrichment/http';

const BASE = 'https://api.company-information.service.gov.uk';

export const companiesHouseProvider: EnrichmentProviderAdapter = {
  id: 'companies_house',
  label: 'Companies House (UK)',
  scopes: ['company'],
  hint: 'UK Companies House REST API key',

  async verify(apiKey) {
    const { status, json } = await enrichmentFetch(`${BASE}/search/companies?q=test&items_per_page=1`, {
      headers: { Authorization: basicAuthHeader(apiKey) },
    });
    if (status === 401) {
      return { ok: false, error: 'Invalid Companies House API key' };
    }
    if (status >= 500) {
      return { ok: false, error: 'Companies House API is temporarily unavailable' };
    }
    return { ok: true };
  },

  async enrich(apiKey, _config, input) {
    const q = input.companyName ?? input.domain.split('.')[0] ?? input.domain;
    const search = await enrichmentFetch(
      `${BASE}/search/companies?q=${encodeURIComponent(q)}&items_per_page=5`,
      { headers: { Authorization: basicAuthHeader(apiKey) } }
    );
    if (search.status >= 400) {
      return { ok: false, status: search.status, body: search.json };
    }

    const items = (search.json as { items?: Record<string, unknown>[] })?.items ?? [];
    const match =
      items.find((item) => {
        const title = String(item.title ?? '').toLowerCase();
        const domainBase = input.domain.split('.')[0]?.toLowerCase() ?? '';
        return domainBase && title.includes(domainBase);
      }) ?? items[0];

    if (!match?.company_number) {
      return { ok: false, status: 404, body: { message: 'No UK company match' } };
    }

    const profile = await enrichmentFetch(`${BASE}/company/${match.company_number}`, {
      headers: { Authorization: basicAuthHeader(apiKey) },
    });
    if (profile.status >= 400) {
      return { ok: false, status: profile.status, body: profile.json };
    }

    const p = profile.json as Record<string, unknown>;
    const addr = p.registered_office_address as Record<string, unknown> | undefined;
    const addressParts = [
      pickString(addr?.address_line_1),
      pickString(addr?.address_line_2),
      pickString(addr?.locality),
      pickString(addr?.postal_code),
    ].filter(Boolean);

    return {
      ok: true,
      scope: 'company',
      company: {
        name: pickString(p.company_name, match.title),
        website: `https://${input.domain}`,
        hqCity: pickString(addr?.locality),
        hqRegion: pickString(addr?.region),
        hqCountry: pickString(addr?.country) ?? 'United Kingdom',
        hqAddress: addressParts.length ? addressParts.join(', ') : null,
        industry: pickString(
          (p.sic_codes as string[] | undefined)?.[0],
          (match.description as string | undefined)
        ),
      },
      raw: { search: search.json, profile: profile.json },
    };
  },
};
