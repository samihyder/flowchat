import type { AppSql } from '@/lib/db-sql';
import { getAccountSettings } from '@/lib/account-settings-db';
import { upsertIntegrationContact } from '@/lib/contact-sync';
import { provisionLeadMonitorAttributes } from '@/lib/leadmonitor-provisioning';
import { dispatchEcosystemContactSync } from '@/lib/ecosystem-dispatch';

export type LeadMonitorInboundLead = {
  externalId: string;
  organizationId: string;
  platform?: string;
  title?: string;
  snippet?: string;
  postUrl?: string;
  author?: string;
  category?: string;
  score?: string | number;
  matchedKeywords?: string;
  verifiedAt?: string;
  email?: string | null;
  phone?: string | null;
};

export function mapLeadMonitorLead(lead: LeadMonitorInboundLead) {
  const name =
    lead.author?.trim() ||
    lead.title?.trim()?.slice(0, 80) ||
    `Lead on ${lead.platform ?? 'social'}`;

  return {
    name,
    email: lead.email?.trim() || null,
    phone: lead.phone?.trim() || null,
    externalId: `leadmonitor:${lead.externalId}`,
    type: 'lead' as const,
    customAttributes: {
      lead_source: 'leadmonitor',
      leadmonitor_lead_id: lead.externalId,
      leadmonitor_platform: lead.platform ?? null,
      leadmonitor_post_url: lead.postUrl ?? null,
      leadmonitor_category: lead.category ?? null,
      leadmonitor_score: lead.score ?? null,
      leadmonitor_keywords: lead.matchedKeywords ?? null,
      leadmonitor_verified_at: lead.verifiedAt ?? null,
      lead_snippet: lead.snippet ?? null,
    },
    note: lead.snippet
      ? `[${lead.platform ?? 'social'}] ${lead.title ?? ''}\n${lead.snippet}\n${lead.postUrl ?? ''}`
      : undefined,
  };
}

export async function syncLeadMonitorLeads(
  sql: AppSql,
  accountId: string,
  leads: LeadMonitorInboundLead[]
) {
  await provisionLeadMonitorAttributes(sql, accountId);

  const settings = await getAccountSettings(sql, accountId);
  const minScore =
    typeof settings.leadmonitorMinScore === 'number' ? settings.leadmonitorMinScore : 0;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const contactIds: string[] = [];

  for (const lead of leads) {
    const numericScore =
      typeof lead.score === 'number'
        ? lead.score
        : Number.parseFloat(String(lead.score ?? '0')) || 0;
    if (numericScore < minScore) {
      skipped += 1;
      continue;
    }

    const mapped = mapLeadMonitorLead(lead);
    const result = await upsertIntegrationContact(sql, accountId, mapped);
    if (result.created) created += 1;
    else updated += 1;
    contactIds.push(result.contact.id);

    void dispatchEcosystemContactSync(sql, accountId, result.contact, result.created);
  }

  return { created, updated, skipped, contactIds };
}
