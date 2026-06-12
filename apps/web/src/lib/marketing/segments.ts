import type { AppSql } from '@/lib/db-sql';

export type SegmentFilters = {
  type?: string;
  labelId?: string;
  marketingStatus?: string;
};

export async function resolveSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string
): Promise<{ id: string; name: string; email: string; phone: string | null; type: string; customAttributes: Record<string, unknown> }[]> {
  const segments = await sql`
    SELECT id, segment_type as "segmentType", filters
    FROM marketing_segments
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const segment = segments[0] as { segmentType: string; filters: SegmentFilters } | undefined;
  if (!segment) return [];

  if (segment.segmentType === 'static') {
    const rows = await sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
      FROM marketing_segment_members sm
      INNER JOIN contacts c ON c.id = sm.contact_id
      WHERE sm.segment_id = ${segmentId}::uuid
        AND c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = 'subscribed'
    `;
    return rows as { id: string; name: string; email: string; phone: string | null; type: string; customAttributes: Record<string, unknown> }[];
  }

  const f = (segment.filters ?? {}) as SegmentFilters;
  const rows = await sql`
    SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
    FROM contacts c
    WHERE c.account_id = ${accountId}::uuid
      AND c.email IS NOT NULL AND c.email <> ''
      AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
      AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
      AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
      ))
  `;
  return rows as { id: string; name: string; email: string; phone: string | null; type: string; customAttributes: Record<string, unknown> }[];
}

export async function countSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string
): Promise<number> {
  const contacts = await resolveSegmentContacts(sql, accountId, segmentId);
  return contacts.length;
}
