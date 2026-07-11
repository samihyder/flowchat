import type { AppSql } from '@/lib/db-sql';
import { slugifyAttributeKey } from '@/lib/custom-attributes';

export type FieldMappingEntry = {
  label: string;
  attrType?: 'text' | 'number' | 'date' | 'boolean' | 'select';
  enabled?: boolean;
};

export async function provisionEnrichmentFieldMappings(
  sql: AppSql,
  accountId: string,
  fieldMappings: Record<string, FieldMappingEntry>
) {
  let created = 0;
  let sortOrder = 200;

  for (const [sourceKey, mapping] of Object.entries(fieldMappings)) {
    if (mapping.enabled === false) continue;
    const key = slugifyAttributeKey(sourceKey.replace(/\./g, '_'));
    const label = mapping.label?.trim() || sourceKey;
    const attrType = mapping.attrType ?? 'text';

    const rows = await sql`
      INSERT INTO custom_attribute_definitions (account_id, entity_type, label, key, attr_type, sort_order)
      VALUES (${accountId}::uuid, 'contact', ${label}, ${key}, ${attrType}, ${sortOrder})
      ON CONFLICT (account_id, entity_type, key) DO UPDATE SET
        label = EXCLUDED.label,
        attr_type = EXCLUDED.attr_type
      RETURNING (xmax = 0) AS inserted
    `;
    if ((rows[0] as { inserted: boolean } | undefined)?.inserted) created++;
    sortOrder += 10;
  }

  return { created };
}
