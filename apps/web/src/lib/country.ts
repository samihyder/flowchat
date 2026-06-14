const COUNTRY_NAMES: Record<string, string> = {
  AE: 'United Arab Emirates',
  AU: 'Australia',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  IN: 'India',
  NL: 'Netherlands',
  PK: 'Pakistan',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  US: 'United States',
};

export function countryLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] ?? upper;
}
