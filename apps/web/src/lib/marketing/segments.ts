import type { AppSql } from '@/lib/db-sql';

export type SegmentFilters = {
  type?: string;
  labelId?: string;
  country?: string;
  marketingStatus?: string;
  inactiveDays?: number;
  hasConversation?: boolean;
};

export type SegmentContact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string;
  customAttributes: Record<string, unknown>;
};

async function resolveDynamicContacts(
  sql: AppSql,
  accountId: string,
  f: SegmentFilters
): Promise<SegmentContact[]> {
  const inactiveDays = f.inactiveDays ?? null;

  if (f.hasConversation === true) {
    return (await sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
      FROM contacts c
      WHERE c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
      AND c.marketing_preference = 'all'
        AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
        AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
        ))
        AND (${f.country ?? null}::text IS NULL OR c.country = ${f.country ?? null})
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
        AND EXISTS (SELECT 1 FROM conversations cv WHERE cv.contact_id = c.id AND cv.account_id = ${accountId}::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM marketing_suppressions ms
          WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
        )
    `) as SegmentContact[];
  }

  if (f.hasConversation === false) {
    return (await sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
      FROM contacts c
      WHERE c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
      AND c.marketing_preference = 'all'
        AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
        AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
        ))
        AND (${f.country ?? null}::text IS NULL OR c.country = ${f.country ?? null})
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
        AND NOT EXISTS (SELECT 1 FROM conversations cv WHERE cv.contact_id = c.id AND cv.account_id = ${accountId}::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM marketing_suppressions ms
          WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
        )
    `) as SegmentContact[];
  }

  return (await sql`
    SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
    FROM contacts c
    WHERE c.account_id = ${accountId}::uuid
      AND c.email IS NOT NULL AND c.email <> ''
      AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
    AND c.marketing_preference = 'all'
      AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
      AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
      ))
      AND (${f.country ?? null}::text IS NULL OR c.country = ${f.country ?? null})
      AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM marketing_suppressions ms
        WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
      )
  `) as SegmentContact[];
}

async function countDynamicContacts(sql: AppSql, accountId: string, f: SegmentFilters): Promise<number> {
  const inactiveDays = f.inactiveDays ?? null;

  if (f.hasConversation === true) {
    const rows = await sql`
      SELECT COUNT(*)::int as count
      FROM contacts c
      WHERE c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
      AND c.marketing_preference = 'all'
        AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
        AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
        ))
        AND (${f.country ?? null}::text IS NULL OR c.country = ${f.country ?? null})
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
        AND EXISTS (SELECT 1 FROM conversations cv WHERE cv.contact_id = c.id AND cv.account_id = ${accountId}::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM marketing_suppressions ms
          WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
        )
    `;
    return Number((rows[0] as { count: number }).count);
  }

  if (f.hasConversation === false) {
    const rows = await sql`
      SELECT COUNT(*)::int as count
      FROM contacts c
      WHERE c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
      AND c.marketing_preference = 'all'
        AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
        AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
        ))
        AND (${f.country ?? null}::text IS NULL OR c.country = ${f.country ?? null})
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
        AND NOT EXISTS (SELECT 1 FROM conversations cv WHERE cv.contact_id = c.id AND cv.account_id = ${accountId}::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM marketing_suppressions ms
          WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
        )
    `;
    return Number((rows[0] as { count: number }).count);
  }

  const rows = await sql`
    SELECT COUNT(*)::int as count
    FROM contacts c
    WHERE c.account_id = ${accountId}::uuid
      AND c.email IS NOT NULL AND c.email <> ''
      AND c.marketing_status = COALESCE(${f.marketingStatus ?? null}::text, 'subscribed')
    AND c.marketing_preference = 'all'
      AND (${f.type ?? null}::text IS NULL OR c.type = ${f.type ?? null})
      AND (${f.labelId ?? null}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${f.labelId ?? null}::uuid
      ))
      AND (${f.country ?? null}::text IS NULL OR c.country = ${f.country ?? null})
      AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM marketing_suppressions ms
        WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
      )
  `;
  return Number((rows[0] as { count: number }).count);
}

export async function resolveSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string
): Promise<SegmentContact[]> {
  const segments = await sql`
    SELECT id, segment_type as "segmentType", filters
    FROM marketing_segments
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const segment = segments[0] as { segmentType: string; filters: SegmentFilters } | undefined;
  if (!segment) return [];

  if (segment.segmentType === 'static') {
    return (await sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
      FROM marketing_segment_members sm
      INNER JOIN contacts c ON c.id = sm.contact_id
      WHERE sm.segment_id = ${segmentId}::uuid
        AND c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = 'subscribed'
        AND c.marketing_preference = 'all'
        AND NOT EXISTS (
          SELECT 1 FROM marketing_suppressions ms
          WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
        )
    `) as SegmentContact[];
  }

  return resolveDynamicContacts(sql, accountId, (segment.filters ?? {}) as SegmentFilters);
}

export async function resolveContactsByFilters(
  sql: AppSql,
  accountId: string,
  segmentType: string,
  filters: SegmentFilters
): Promise<SegmentContact[]> {
  if (segmentType === 'static') return [];
  return resolveDynamicContacts(sql, accountId, filters ?? {});
}

export async function countSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string
): Promise<number> {
  const segments = await sql`
    SELECT segment_type as "segmentType", filters
    FROM marketing_segments
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const segment = segments[0] as { segmentType: string; filters: SegmentFilters } | undefined;
  if (!segment) return 0;

  if (segment.segmentType === 'static') {
    const rows = await sql`
      SELECT COUNT(*)::int as count
      FROM marketing_segment_members sm
      INNER JOIN contacts c ON c.id = sm.contact_id
      WHERE sm.segment_id = ${segmentId}::uuid
        AND c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = 'subscribed'
        AND c.marketing_preference = 'all'
        AND NOT EXISTS (
          SELECT 1 FROM marketing_suppressions ms
          WHERE ms.account_id = c.account_id AND lower(ms.email) = lower(c.email)
        )
    `;
    return Number((rows[0] as { count: number }).count);
  }

  return countDynamicContacts(sql, accountId, (segment.filters ?? {}) as SegmentFilters);
}

export async function previewSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string,
  limit = 5
): Promise<SegmentContact[]> {
  return (await resolveSegmentContacts(sql, accountId, segmentId)).slice(0, limit);
}
