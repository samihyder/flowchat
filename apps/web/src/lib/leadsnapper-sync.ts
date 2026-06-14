import type { AppSql } from '@/lib/db-sql';
import { getAccountSettings } from '@/lib/account-settings-db';
import {
  serializeDefinitionRow,
  validateCustomAttributes,
  type CustomAttributeDefinition,
} from '@/lib/custom-attributes';
import { upsertIntegrationContact } from '@/lib/contact-sync';

export type LeadSnapperInboundLead = {
  leadId?: string;
  businessName?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  website?: string;
  domain?: string;
  city?: string;
  country?: string;
  address?: string;
  industry?: string;
  leadScore?: number;
  leadPriority?: string;
  priority?: string;
  leadStatus?: string;
  brandFit?: string;
  serviceFit?: string[] | string;
  googleRating?: number;
  googleReviews?: number;
  hasChatWidget?: boolean;
  chatWidget?: string;
  chatWidgetProvider?: string;
  technologyDetected?: string[] | string;
  techStack?: string[] | string;
  sourceType?: string;
  ownerName?: string;
  ownerMobile?: string;
  ownerPhone?: string;
  ownerWorkEmail?: string;
  decisionMakerLinkedin?: string;
  ownerLinkedin?: string;
  ownerLinkedinUrl?: string;
  linkedinUrl?: string;
  businessLinkedin?: string;
  linkedinCompany?: string;
  gmbPhone?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  xTwitterUrl?: string;
  whatsappUrl?: string;
  socialLinks?: {
    linkedinCompany?: string;
    linkedinPerson?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    xTwitter?: string;
    whatsapp?: string;
  };
  notes?: string;
  /** Full enrichment chain, e.g. "UK: Companies House → Openmart → Cognism" */
  b2bSource?: string;
  enrichmentPipeline?: string;
  /** API that supplied owner mobile: Openmart, Cognism, Lusha */
  mobileSource?: string;
  targetMarket?: string;
  companiesHouseMatched?: boolean;
  customAttributes?: Record<string, unknown>;
};

function joinList(value: string[] | string | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value).trim() || undefined;
}

function normalizeDomain(domain?: string, website?: string): string | undefined {
  if (domain?.trim()) return domain.trim().toLowerCase();
  if (!website?.trim()) return undefined;
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname;
    return host.replace(/^www\./, '').toLowerCase();
  } catch {
    return website.trim().toLowerCase();
  }
}

function normalizeMarket(lead: LeadSnapperInboundLead): string | null {
  const market = lead.targetMarket?.trim() || lead.country?.trim();
  if (!market) return null;
  const upper = market.toUpperCase();
  if (upper === 'UK' || upper.includes('UNITED KINGDOM') || upper === 'GB') return 'UK';
  if (upper === 'US' || upper === 'USA' || upper.includes('UNITED STATES')) return 'USA';
  return market;
}

/** Derive enrichment providers from LeadSnapper b2b/mobile source strings. */
export function resolveEnrichmentSources(lead: LeadSnapperInboundLead): {
  pipeline: string | null;
  mobileSource: string | null;
  providers: string[];
  market: string | null;
} {
  const pipeline =
    lead.enrichmentPipeline?.trim() ||
    lead.b2bSource?.trim() ||
    (() => {
      const market = normalizeMarket(lead);
      if (market === 'UK') return 'UK: Companies House → Openmart → Cognism';
      if (market === 'USA') return 'US: Openmart → Lusha';
      return null;
    })();

  const haystack = [
    pipeline,
    lead.mobileSource,
    lead.b2bSource,
    lead.customAttributes?.enrichment_pipeline,
    lead.customAttributes?.b2b_source,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const providers: string[] = [];

  if (
    lead.companiesHouseMatched ||
    haystack.includes('companies house') ||
    haystack.includes('companieshouse')
  ) {
    providers.push('Companies House UK');
  }
  if (haystack.includes('openmart') || haystack.includes('open mart')) {
    providers.push('Openmart');
  }
  if (haystack.includes('cognism')) {
    providers.push('Cognism (UK)');
  }
  if (haystack.includes('lusha')) {
    providers.push('Lusha (US)');
  }

  const market = normalizeMarket(lead);
  const uniqueProviders = [...new Set(providers)];

  let mobileSource = lead.mobileSource?.trim() || null;
  if (mobileSource) {
    if (/cognism/i.test(mobileSource)) mobileSource = 'Cognism (UK)';
    else if (/lusha/i.test(mobileSource)) mobileSource = 'Lusha (US)';
    else if (/openmart|open mart/i.test(mobileSource)) mobileSource = 'Openmart';
    else if (/companies house/i.test(mobileSource)) mobileSource = 'Companies House UK';
  }

  return {
    pipeline,
    mobileSource,
    providers: uniqueProviders,
    market,
  };
}

function firstNonEmpty(...values: (string | undefined | null)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function resolveSocialProfiles(lead: LeadSnapperInboundLead): {
  businessLinkedin: string | undefined;
  ownerLinkedin: string | undefined;
  businessPhone: string | undefined;
  ownerPhone: string | undefined;
  facebook: string | undefined;
  instagram: string | undefined;
  tiktok: string | undefined;
  youtube: string | undefined;
  xTwitter: string | undefined;
  whatsapp: string | undefined;
  socialLinks: string | undefined;
} {
  const social = lead.socialLinks;
  const businessLinkedin = firstNonEmpty(
    lead.businessLinkedin,
    lead.linkedinCompany,
    lead.linkedinUrl,
    social?.linkedinCompany
  );
  const ownerLinkedin = firstNonEmpty(
    lead.decisionMakerLinkedin,
    lead.ownerLinkedin,
    lead.ownerLinkedinUrl,
    social?.linkedinPerson
  );
  const businessPhone = firstNonEmpty(lead.primaryPhone, lead.phone, lead.gmbPhone);
  const ownerPhone = firstNonEmpty(lead.ownerPhone, lead.ownerMobile);
  const facebook = firstNonEmpty(lead.facebookUrl, social?.facebook);
  const instagram = firstNonEmpty(lead.instagramUrl, social?.instagram);
  const tiktok = firstNonEmpty(lead.tiktokUrl, social?.tiktok);
  const youtube = firstNonEmpty(lead.youtubeUrl, social?.youtube);
  const xTwitter = firstNonEmpty(lead.xTwitterUrl, social?.xTwitter);
  const whatsapp = firstNonEmpty(lead.whatsappUrl, social?.whatsapp);

  const socialLinks = [
    businessLinkedin ? `LinkedIn (business): ${businessLinkedin}` : null,
    ownerLinkedin ? `LinkedIn (owner): ${ownerLinkedin}` : null,
    facebook ? `Facebook: ${facebook}` : null,
    instagram ? `Instagram: ${instagram}` : null,
    tiktok ? `TikTok: ${tiktok}` : null,
    youtube ? `YouTube: ${youtube}` : null,
    xTwitter ? `X/Twitter: ${xTwitter}` : null,
    whatsapp ? `WhatsApp: ${whatsapp}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    businessLinkedin,
    ownerLinkedin,
    businessPhone,
    ownerPhone,
    facebook,
    instagram,
    tiktok,
    youtube,
    xTwitter,
    whatsapp,
    socialLinks: socialLinks || undefined,
  };
}

export function mapLeadSnapperLead(lead: LeadSnapperInboundLead): {
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  customAttributes: Record<string, unknown>;
  note?: string;
  priority: string | null;
} {
  const name = (lead.businessName || lead.name || '').trim();
  const email =
    lead.primaryEmail?.trim() ||
    lead.email?.trim() ||
    lead.ownerWorkEmail?.trim() ||
    null;
  const profiles = resolveSocialProfiles(lead);
  const phone = profiles.businessPhone || profiles.ownerPhone || null;
  const domain = normalizeDomain(lead.domain, lead.website);
  const priority = (lead.leadPriority || lead.priority || null)?.trim() || null;
  const techStack = joinList(lead.technologyDetected ?? lead.techStack);
  const enrichment = resolveEnrichmentSources(lead);

  const customAttributes: Record<string, unknown> = {
    lead_source: 'leadsnapper',
    ...(lead.leadId ? { leadsnapper_lead_id: lead.leadId } : {}),
    ...(name ? { business_name: name } : {}),
    ...(lead.website ? { website: lead.website } : {}),
    ...(domain ? { domain } : {}),
    ...(profiles.businessPhone ? { business_phone: profiles.businessPhone } : {}),
    ...(profiles.businessLinkedin ? { business_linkedin: profiles.businessLinkedin } : {}),
    ...(lead.city ? { city: lead.city } : {}),
    ...(lead.country ? { country: lead.country } : {}),
    ...(lead.address ? { address: lead.address } : {}),
    ...(lead.industry ? { industry: lead.industry } : {}),
    ...(lead.leadScore !== undefined ? { lead_score: lead.leadScore } : {}),
    ...(priority ? { lead_priority: priority } : {}),
    ...(lead.leadStatus ? { lead_status: lead.leadStatus } : {}),
    ...(lead.brandFit ? { brand_fit: lead.brandFit } : {}),
    ...(lead.serviceFit ? { service_fit: joinList(lead.serviceFit) } : {}),
    ...(lead.googleRating !== undefined ? { google_rating: lead.googleRating } : {}),
    ...(lead.googleReviews !== undefined ? { google_reviews: lead.googleReviews } : {}),
    ...(lead.hasChatWidget !== undefined ? { has_chat_widget: lead.hasChatWidget } : {}),
    ...(lead.chatWidgetProvider || lead.chatWidget
      ? { chat_widget_provider: lead.chatWidgetProvider || lead.chatWidget }
      : {}),
    ...(techStack ? { tech_stack: techStack } : {}),
    ...(lead.sourceType ? { source_type: lead.sourceType } : {}),
    ...(lead.ownerName ? { owner_name: lead.ownerName } : {}),
    ...(profiles.ownerPhone ? { owner_phone: profiles.ownerPhone } : {}),
    ...(lead.ownerMobile ? { owner_mobile: lead.ownerMobile } : {}),
    ...(profiles.ownerLinkedin ? { owner_linkedin: profiles.ownerLinkedin } : {}),
    ...(profiles.facebook ? { facebook_url: profiles.facebook } : {}),
    ...(profiles.instagram ? { instagram_url: profiles.instagram } : {}),
    ...(profiles.tiktok ? { tiktok_url: profiles.tiktok } : {}),
    ...(profiles.youtube ? { youtube_url: profiles.youtube } : {}),
    ...(profiles.xTwitter ? { x_twitter_url: profiles.xTwitter } : {}),
    ...(profiles.whatsapp ? { whatsapp_url: profiles.whatsapp } : {}),
    ...(profiles.socialLinks ? { social_links: profiles.socialLinks } : {}),
    ...(enrichment.pipeline ? { enrichment_pipeline: enrichment.pipeline } : {}),
    ...(enrichment.mobileSource ? { owner_mobile_source: enrichment.mobileSource } : {}),
    ...(enrichment.providers.length > 0
      ? { enrichment_providers: enrichment.providers.join(', ') }
      : {}),
    ...(enrichment.market ? { enrichment_market: enrichment.market } : {}),
    companies_house_uk: enrichment.providers.includes('Companies House UK'),
    openmart: enrichment.providers.includes('Openmart'),
    cognism_uk: enrichment.providers.includes('Cognism (UK)'),
    lusha_us: enrichment.providers.includes('Lusha (US)'),
    ...lead.customAttributes,
  };

  const noteParts = [
    lead.notes?.trim(),
    lead.ownerName ? `Owner: ${lead.ownerName}` : null,
    profiles.businessPhone ? `Business phone: ${profiles.businessPhone}` : null,
    profiles.ownerPhone ? `Owner phone: ${profiles.ownerPhone}` : null,
    profiles.businessLinkedin ? `Business LinkedIn: ${profiles.businessLinkedin}` : null,
    profiles.ownerLinkedin ? `Owner LinkedIn: ${profiles.ownerLinkedin}` : null,
    lead.website ? `Website: ${lead.website}` : null,
    profiles.socialLinks ? `Social: ${profiles.socialLinks}` : null,
    enrichment.pipeline ? `Enrichment: ${enrichment.pipeline}` : null,
    enrichment.mobileSource ? `Mobile source: ${enrichment.mobileSource}` : null,
  ].filter(Boolean);

  return {
    name,
    email,
    phone,
    externalId: lead.leadId ? `leadsnapper:${lead.leadId}` : null,
    customAttributes,
    note: noteParts.length > 0 ? noteParts.join('\n') : undefined,
    priority,
  };
}

function passesPriorityFilter(
  priority: string | null,
  minPriority: 'Hot' | 'Warm' | 'all' | undefined
): boolean {
  if (!minPriority || minPriority === 'all') return true;
  if (!priority) return true;
  if (minPriority === 'Hot') return priority === 'Hot';
  if (minPriority === 'Warm') return priority === 'Hot' || priority === 'Warm';
  return true;
}

async function loadContactAttributeDefinitions(
  sql: AppSql,
  accountId: string
): Promise<CustomAttributeDefinition[]> {
  const rows = await sql`
    SELECT id, entity_type as "entityType", key, label,
           attr_type as "attrType", options, sort_order as "sortOrder"
    FROM custom_attribute_definitions
    WHERE account_id = ${accountId}::uuid AND entity_type = 'contact'
  `;
  return (rows as Record<string, unknown>[]).map(serializeDefinitionRow);
}

async function appendContactNote(
  sql: AppSql,
  accountId: string,
  contactId: string,
  content: string
) {
  await sql`
    INSERT INTO contact_notes (contact_id, account_id, author_id, content)
    VALUES (${contactId}::uuid, ${accountId}::uuid, NULL, ${content})
  `;
}

export async function syncLeadSnapperLeads(
  sql: AppSql,
  accountId: string,
  leads: LeadSnapperInboundLead[]
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: { leadId: string | null; contactId: string; created: boolean; error?: string }[];
}> {
  const settings = await getAccountSettings(sql, accountId);
  const definitions = await loadContactAttributeDefinitions(sql, accountId);
  const results: {
    leadId: string | null;
    contactId: string;
    created: boolean;
    error?: string;
  }[] = [];

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const raw of leads) {
    const mapped = mapLeadSnapperLead(raw);
    if (!mapped.name) {
      failed += 1;
      results.push({
        leadId: raw.leadId ?? null,
        contactId: '',
        created: false,
        error: 'businessName is required',
      });
      continue;
    }

    if (!passesPriorityFilter(mapped.priority, settings.leadsnapperMinPriority)) {
      skipped += 1;
      results.push({
        leadId: raw.leadId ?? null,
        contactId: '',
        created: false,
        error: 'skipped: below minimum priority',
      });
      continue;
    }

    const { valid: customAttributes, errors } = validateCustomAttributes(
      definitions,
      mapped.customAttributes
    );
    if (errors.length > 0) {
      failed += 1;
      results.push({
        leadId: raw.leadId ?? null,
        contactId: '',
        created: false,
        error: errors.join('; '),
      });
      continue;
    }

    try {
      const { contact, created: isNew } = await upsertIntegrationContact(sql, accountId, {
        name: mapped.name,
        email: mapped.email,
        phone: mapped.phone,
        type: 'lead',
        externalId: mapped.externalId,
        customAttributes,
        matchByDomain: true,
      });

      if (mapped.note && isNew) {
        await appendContactNote(sql, accountId, contact.id, mapped.note);
      }

      if (isNew) created += 1;
      else updated += 1;

      results.push({
        leadId: raw.leadId ?? null,
        contactId: contact.id,
        created: isNew,
      });
    } catch {
      failed += 1;
      results.push({
        leadId: raw.leadId ?? null,
        contactId: '',
        created: false,
        error: 'failed to sync',
      });
    }
  }

  return { created, updated, skipped, failed, results };
}
