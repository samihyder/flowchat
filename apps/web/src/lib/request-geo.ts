export type ClientGeo = {
  countryCode: string | null;
  city: string | null;
  region: string | null;
};

/** Resolve coarse geo from edge/proxy headers (Vercel, Cloudflare). */
export function getClientGeo(req: Request): ClientGeo {
  const countryCode =
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-country-code') ??
    null;

  const city =
    req.headers.get('x-vercel-ip-city') ??
    req.headers.get('cf-ipcity') ??
    null;

  const region =
    req.headers.get('x-vercel-ip-country-region') ??
    req.headers.get('cf-region') ??
    null;

  return {
    countryCode: countryCode && countryCode !== 'XX' ? countryCode.toUpperCase() : null,
    city: city ? decodeURIComponent(city) : null,
    region: region ? decodeURIComponent(region) : null,
  };
}
