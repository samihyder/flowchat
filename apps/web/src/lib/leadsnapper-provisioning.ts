import type { AppSql } from '@/lib/db-sql';
import { slugifyAttributeKey } from '@/lib/custom-attributes';

/** Custom attribute definitions seeded for LeadSnapper → CRM sync. */
export const LEADSNAPPER_CONTACT_ATTRIBUTES: {
  label: string;
  key: string;
  attrType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  sortOrder: number;
}[] = [
  { label: 'LeadSnapper lead ID', key: 'leadsnapper_lead_id', attrType: 'text', sortOrder: 10 },
  { label: 'Business name', key: 'business_name', attrType: 'text', sortOrder: 20 },
  { label: 'Website', key: 'website', attrType: 'text', sortOrder: 30 },
  { label: 'Business phone', key: 'business_phone', attrType: 'text', sortOrder: 31 },
  { label: 'Business LinkedIn', key: 'business_linkedin', attrType: 'text', sortOrder: 32 },
  { label: 'Domain', key: 'domain', attrType: 'text', sortOrder: 40 },
  { label: 'City', key: 'city', attrType: 'text', sortOrder: 50 },
  { label: 'Country', key: 'country', attrType: 'text', sortOrder: 60 },
  { label: 'Address', key: 'address', attrType: 'text', sortOrder: 70 },
  { label: 'Industry', key: 'industry', attrType: 'text', sortOrder: 80 },
  { label: 'Lead score', key: 'lead_score', attrType: 'number', sortOrder: 90 },
  {
    label: 'Priority',
    key: 'lead_priority',
    attrType: 'select',
    options: ['Hot', 'Warm', 'Cold'],
    sortOrder: 100,
  },
  {
    label: 'Lead status',
    key: 'lead_status',
    attrType: 'select',
    options: [
      'New',
      'Verified',
      'Contacted',
      'Follow-up Required',
      'Meeting Booked',
      'Proposal Sent',
      'Won',
      'Lost',
      'Not Relevant',
    ],
    sortOrder: 110,
  },
  { label: 'Brand fit', key: 'brand_fit', attrType: 'text', sortOrder: 120 },
  { label: 'Service fit', key: 'service_fit', attrType: 'text', sortOrder: 130 },
  { label: 'Google rating', key: 'google_rating', attrType: 'number', sortOrder: 140 },
  { label: 'Google reviews', key: 'google_reviews', attrType: 'number', sortOrder: 150 },
  { label: 'Has chat widget', key: 'has_chat_widget', attrType: 'boolean', sortOrder: 160 },
  { label: 'Chat widget provider', key: 'chat_widget_provider', attrType: 'text', sortOrder: 170 },
  { label: 'Tech stack', key: 'tech_stack', attrType: 'text', sortOrder: 180 },
  { label: 'Source type', key: 'source_type', attrType: 'text', sortOrder: 190 },
  {
    label: 'Enrichment market',
    key: 'enrichment_market',
    attrType: 'select',
    options: ['UK', 'USA', 'UAE', 'Canada', 'Australia', 'EU'],
    sortOrder: 195,
  },
  {
    label: 'Enrichment pipeline',
    key: 'enrichment_pipeline',
    attrType: 'text',
    sortOrder: 196,
  },
  {
    label: 'Enrichment providers',
    key: 'enrichment_providers',
    attrType: 'text',
    sortOrder: 197,
  },
  {
    label: 'Owner mobile source',
    key: 'owner_mobile_source',
    attrType: 'select',
    options: ['Companies House UK', 'Openmart', 'Cognism (UK)', 'Lusha (US)'],
    sortOrder: 198,
  },
  { label: 'Companies House UK', key: 'companies_house_uk', attrType: 'boolean', sortOrder: 199 },
  { label: 'Openmart', key: 'openmart', attrType: 'boolean', sortOrder: 200 },
  { label: 'Cognism (UK)', key: 'cognism_uk', attrType: 'boolean', sortOrder: 201 },
  { label: 'Lusha (US)', key: 'lusha_us', attrType: 'boolean', sortOrder: 202 },
  { label: 'Owner name', key: 'owner_name', attrType: 'text', sortOrder: 210 },
  { label: 'Owner phone', key: 'owner_phone', attrType: 'text', sortOrder: 220 },
  { label: 'Owner mobile', key: 'owner_mobile', attrType: 'text', sortOrder: 225 },
  { label: 'Owner LinkedIn', key: 'owner_linkedin', attrType: 'text', sortOrder: 230 },
  { label: 'Facebook', key: 'facebook_url', attrType: 'text', sortOrder: 240 },
  { label: 'Instagram', key: 'instagram_url', attrType: 'text', sortOrder: 241 },
  { label: 'TikTok', key: 'tiktok_url', attrType: 'text', sortOrder: 242 },
  { label: 'YouTube', key: 'youtube_url', attrType: 'text', sortOrder: 243 },
  { label: 'X / Twitter', key: 'x_twitter_url', attrType: 'text', sortOrder: 244 },
  { label: 'WhatsApp', key: 'whatsapp_url', attrType: 'text', sortOrder: 245 },
  { label: 'Social links', key: 'social_links', attrType: 'text', sortOrder: 246 },
  { label: 'Lead source', key: 'lead_source', attrType: 'text', sortOrder: 250 },
];

export async function provisionLeadSnapperAttributes(
  sql: AppSql,
  accountId: string
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const attr of LEADSNAPPER_CONTACT_ATTRIBUTES) {
    const key = attr.key || slugifyAttributeKey(attr.label);
    const existing = await sql`
      SELECT id FROM custom_attribute_definitions
      WHERE account_id = ${accountId}::uuid AND entity_type = 'contact' AND key = ${key}
      LIMIT 1
    `;

    await sql`
      INSERT INTO custom_attribute_definitions (account_id, entity_type, key, label, attr_type, options, sort_order)
      VALUES (
        ${accountId}::uuid,
        'contact',
        ${key},
        ${attr.label},
        ${attr.attrType},
        ${attr.options ? JSON.stringify(attr.options) : null}::jsonb,
        ${attr.sortOrder}
      )
      ON CONFLICT (account_id, entity_type, key) DO UPDATE SET
        label = EXCLUDED.label,
        attr_type = EXCLUDED.attr_type,
        options = EXCLUDED.options,
        sort_order = EXCLUDED.sort_order
    `;

    if (existing[0]) updated += 1;
    else created += 1;
  }

  return { created, updated };
}
