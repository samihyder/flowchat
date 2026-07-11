import type { AppSql } from '@/lib/db-sql';
import { slugifyAttributeKey } from '@/lib/custom-attributes';

export const LEADMONITOR_CONTACT_ATTRIBUTES = [
  { label: 'LeadMonitor lead ID', key: 'leadmonitor_lead_id', attrType: 'text' as const, sortOrder: 10 },
  { label: 'Platform', key: 'leadmonitor_platform', attrType: 'text' as const, sortOrder: 20 },
  { label: 'Post URL', key: 'leadmonitor_post_url', attrType: 'text' as const, sortOrder: 30 },
  { label: 'Category', key: 'leadmonitor_category', attrType: 'text' as const, sortOrder: 40 },
  { label: 'Score', key: 'leadmonitor_score', attrType: 'text' as const, sortOrder: 50 },
  { label: 'Keywords', key: 'leadmonitor_keywords', attrType: 'text' as const, sortOrder: 60 },
  { label: 'Verified at', key: 'leadmonitor_verified_at', attrType: 'date' as const, sortOrder: 70 },
];

export async function provisionLeadMonitorAttributes(sql: AppSql, accountId: string) {
  for (const attr of LEADMONITOR_CONTACT_ATTRIBUTES) {
    const key = slugifyAttributeKey(attr.key);
    await sql`
      INSERT INTO custom_attribute_definitions (account_id, entity_type, key, label, attr_type, sort_order)
      VALUES (
        ${accountId}::uuid,
        'contact',
        ${key},
        ${attr.label},
        ${attr.attrType},
        ${attr.sortOrder}
      )
      ON CONFLICT (account_id, entity_type, key) DO UPDATE SET
        label = EXCLUDED.label,
        attr_type = EXCLUDED.attr_type,
        sort_order = EXCLUDED.sort_order
    `;
  }
}
