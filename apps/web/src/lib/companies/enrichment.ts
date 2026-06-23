/**
 * Phase 1 auto-link only — tenant-triggered enrichment runs via runContactEnrichment().
 */
export function scheduleCompanyEnrichment(_companyId: string, _domain: string): void {
  // Intentionally no-op: enrichment is on-demand with a tenant-selected provider.
}
