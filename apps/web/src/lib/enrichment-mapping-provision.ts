import type { AppSql } from '@/lib/db-sql';
import { slugifyAttributeKey } from '@/lib/custom-attributes';
import type { FieldMappingEntry } from '@/lib/enrichment-field-schemas';

export type { FieldMappingEntry };

export async function provisionEnrichmentFieldMappings(
  sql: AppSql,
  accountId: string,
  fieldMappings: Record<string, FieldMappingEntry>
) {
  let created = 0;
  let sortOrder = 200;

  const sorted = Object.entries(fieldMappings).sort(
    ([, a], [, b]) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  for (const [sourceKey, mapping] of sorted) {
    if (mapping.enabled === false) continue;
    const target = mapping.targetKey ?? sourceKey;
    if (target.startsWith('company.')) continue;
    if (['contact.email', 'contact.phone', 'contact.name'].includes(target)) continue;

    const key = slugifyAttributeKey(target.replace(/\./g, '_'));
    const label = mapping.label?.trim() || target.split('.').pop() || sourceKey;
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
