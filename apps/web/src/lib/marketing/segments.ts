import type { AppSql } from '@/lib/db-sql';
import { isEmailSuppressed } from '@/lib/marketing/suppressions';

export type SegmentFilters = {
  type?: string;
  labelId?: string;
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

async function filterSubscribed(
  sql: AppSql,
  accountId: string,
  contacts: SegmentContact[]
): Promise<SegmentContact[]> {
  const out: SegmentContact[] = [];
  for (const c of contacts) {
    if (!c.email) continue;
    if (await isEmailSuppressed(sql, accountId, c.email)) continue;
    out.push(c);
  }
  return out;
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
    const rows = await sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.custom_attributes as "customAttributes"
      FROM marketing_segment_members sm
      INNER JOIN contacts c ON c.id = sm.contact_id
      WHERE sm.segment_id = ${segmentId}::uuid
        AND c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL AND c.email <> ''
        AND c.marketing_status = 'subscribed'
        AND c.marketing_preference = 'all'
    `;
    return filterSubscribed(sql, accountId, rows as SegmentContact[]);
  }

  const f = (segment.filters ?? {}) as SegmentFilters;
  const inactiveDays = f.inactiveDays ?? null;

  let rows: SegmentContact[];
  if (f.hasConversation === true) {
    rows = (await sql`
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
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
        AND EXISTS (SELECT 1 FROM conversations cv WHERE cv.contact_id = c.id AND cv.account_id = ${accountId}::uuid)
    `) as SegmentContact[];
  } else if (f.hasConversation === false) {
    rows = (await sql`
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
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
        AND NOT EXISTS (SELECT 1 FROM conversations cv WHERE cv.contact_id = c.id AND cv.account_id = ${accountId}::uuid)
    `) as SegmentContact[];
  } else {
    rows = (await sql`
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
        AND (${inactiveDays}::int IS NULL OR c.last_activity_at < NOW() - (${String(inactiveDays)}::text || ' days')::interval)
    `) as SegmentContact[];
  }

  return filterSubscribed(sql, accountId, rows);
}

export async function countSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string
): Promise<number> {
  return (await resolveSegmentContacts(sql, accountId, segmentId)).length;
}

export async function previewSegmentContacts(
  sql: AppSql,
  accountId: string,
  segmentId: string,
  limit = 5
): Promise<SegmentContact[]> {
  return (await resolveSegmentContacts(sql, accountId, segmentId)).slice(0, limit);
}
