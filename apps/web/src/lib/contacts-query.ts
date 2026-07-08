import type { AppSql } from '@/lib/db-sql';

export type ContactListParams = {
  accountId: string;
  q?: string | null;
  type?: string | null;
  labelId?: string | null;
  ids?: string[] | null;
  sort?: string;
  orderAsc?: boolean;
  marketingStatus?: string | null;
  country?: string | null;
  hasAutomation?: string | null;
  limit?: number;
  offset?: number;
};

export async function listContacts(sql: AppSql, p: ContactListParams) {
  const pattern = p.q ? `%${p.q}%` : null;
  const sort = p.sort ?? 'last_activity_at';
  const orderAsc = p.orderAsc ?? false;
  const limit = Math.min(p.limit ?? 50, 100);
  const offset = Math.max(p.offset ?? 0, 0);
  const ids = p.ids?.length ? p.ids : null;

  if (sort === 'name' && orderAsc) {
    return sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.country, c.external_id as "externalId",
             c.marketing_status as "marketingStatus",
             c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name)
                FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
                WHERE cl.contact_id = c.id),
               '[]'::json
             ) as labels,
             (SELECT json_build_object(
                'name', mw.name,
                'currentStep', mwe.current_step_order,
                'totalSteps', (SELECT COUNT(*)::int FROM marketing_workflow_steps mws WHERE mws.workflow_id = mw.id)
              )
              FROM marketing_workflow_enrollments mwe
              INNER JOIN marketing_workflows mw ON mw.id = mwe.workflow_id
              WHERE mwe.contact_id = c.id AND mwe.status = 'active'
              ORDER BY mwe.enrolled_at DESC
              LIMIT 1
             ) as "activeAutomation",
             COUNT(*) OVER()::int as "totalCount"
      FROM contacts c
      WHERE c.account_id = ${p.accountId}::uuid
        AND (${p.type ?? null}::text IS NULL OR c.type = ${p.type ?? null})
        AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
        AND (${p.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${p.labelId ?? null}::uuid
        ))
        AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
        AND (${p.marketingStatus ?? null}::text IS NULL OR c.marketing_status = ${p.marketingStatus ?? null})
        AND (${p.country ?? null}::text IS NULL OR c.country = ${p.country ?? null})
        AND (${p.hasAutomation ?? null}::text IS NULL OR
          (${p.hasAutomation ?? null}::text = 'yes') = EXISTS (
            SELECT 1 FROM marketing_workflow_enrollments mwe2
            WHERE mwe2.contact_id = c.id AND mwe2.status = 'active'
          )
        )
      ORDER BY c.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (sort === 'name') {
    return sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.country, c.external_id as "externalId",
             c.marketing_status as "marketingStatus",
             c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name)
                FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
                WHERE cl.contact_id = c.id),
               '[]'::json
             ) as labels,
             (SELECT json_build_object(
                'name', mw.name,
                'currentStep', mwe.current_step_order,
                'totalSteps', (SELECT COUNT(*)::int FROM marketing_workflow_steps mws WHERE mws.workflow_id = mw.id)
              )
              FROM marketing_workflow_enrollments mwe
              INNER JOIN marketing_workflows mw ON mw.id = mwe.workflow_id
              WHERE mwe.contact_id = c.id AND mwe.status = 'active'
              ORDER BY mwe.enrolled_at DESC
              LIMIT 1
             ) as "activeAutomation",
             COUNT(*) OVER()::int as "totalCount"
      FROM contacts c
      WHERE c.account_id = ${p.accountId}::uuid
        AND (${p.type ?? null}::text IS NULL OR c.type = ${p.type ?? null})
        AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
        AND (${p.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${p.labelId ?? null}::uuid
        ))
        AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
        AND (${p.marketingStatus ?? null}::text IS NULL OR c.marketing_status = ${p.marketingStatus ?? null})
        AND (${p.country ?? null}::text IS NULL OR c.country = ${p.country ?? null})
        AND (${p.hasAutomation ?? null}::text IS NULL OR
          (${p.hasAutomation ?? null}::text = 'yes') = EXISTS (
            SELECT 1 FROM marketing_workflow_enrollments mwe2
            WHERE mwe2.contact_id = c.id AND mwe2.status = 'active'
          )
        )
      ORDER BY c.name DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (sort === 'created_at' && orderAsc) {
    return sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.country, c.external_id as "externalId",
             c.marketing_status as "marketingStatus",
             c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name)
                FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
                WHERE cl.contact_id = c.id),
               '[]'::json
             ) as labels,
             (SELECT json_build_object(
                'name', mw.name,
                'currentStep', mwe.current_step_order,
                'totalSteps', (SELECT COUNT(*)::int FROM marketing_workflow_steps mws WHERE mws.workflow_id = mw.id)
              )
              FROM marketing_workflow_enrollments mwe
              INNER JOIN marketing_workflows mw ON mw.id = mwe.workflow_id
              WHERE mwe.contact_id = c.id AND mwe.status = 'active'
              ORDER BY mwe.enrolled_at DESC
              LIMIT 1
             ) as "activeAutomation",
             COUNT(*) OVER()::int as "totalCount"
      FROM contacts c
      WHERE c.account_id = ${p.accountId}::uuid
        AND (${p.type ?? null}::text IS NULL OR c.type = ${p.type ?? null})
        AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
        AND (${p.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${p.labelId ?? null}::uuid
        ))
        AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
        AND (${p.marketingStatus ?? null}::text IS NULL OR c.marketing_status = ${p.marketingStatus ?? null})
        AND (${p.country ?? null}::text IS NULL OR c.country = ${p.country ?? null})
        AND (${p.hasAutomation ?? null}::text IS NULL OR
          (${p.hasAutomation ?? null}::text = 'yes') = EXISTS (
            SELECT 1 FROM marketing_workflow_enrollments mwe2
            WHERE mwe2.contact_id = c.id AND mwe2.status = 'active'
          )
        )
      ORDER BY c.created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (sort === 'created_at') {
    return sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.country, c.external_id as "externalId",
             c.marketing_status as "marketingStatus",
             c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name)
                FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
                WHERE cl.contact_id = c.id),
               '[]'::json
             ) as labels,
             (SELECT json_build_object(
                'name', mw.name,
                'currentStep', mwe.current_step_order,
                'totalSteps', (SELECT COUNT(*)::int FROM marketing_workflow_steps mws WHERE mws.workflow_id = mw.id)
              )
              FROM marketing_workflow_enrollments mwe
              INNER JOIN marketing_workflows mw ON mw.id = mwe.workflow_id
              WHERE mwe.contact_id = c.id AND mwe.status = 'active'
              ORDER BY mwe.enrolled_at DESC
              LIMIT 1
             ) as "activeAutomation",
             COUNT(*) OVER()::int as "totalCount"
      FROM contacts c
      WHERE c.account_id = ${p.accountId}::uuid
        AND (${p.type ?? null}::text IS NULL OR c.type = ${p.type ?? null})
        AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
        AND (${p.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${p.labelId ?? null}::uuid
        ))
        AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
        AND (${p.marketingStatus ?? null}::text IS NULL OR c.marketing_status = ${p.marketingStatus ?? null})
        AND (${p.country ?? null}::text IS NULL OR c.country = ${p.country ?? null})
        AND (${p.hasAutomation ?? null}::text IS NULL OR
          (${p.hasAutomation ?? null}::text = 'yes') = EXISTS (
            SELECT 1 FROM marketing_workflow_enrollments mwe2
            WHERE mwe2.contact_id = c.id AND mwe2.status = 'active'
          )
        )
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (orderAsc) {
    return sql`
      SELECT c.id, c.name, c.email, c.phone, c.type, c.country, c.external_id as "externalId",
             c.marketing_status as "marketingStatus",
             c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
             c.created_at as "createdAt", c.updated_at as "updatedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name)
                FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
                WHERE cl.contact_id = c.id),
               '[]'::json
             ) as labels,
             (SELECT json_build_object(
                'name', mw.name,
                'currentStep', mwe.current_step_order,
                'totalSteps', (SELECT COUNT(*)::int FROM marketing_workflow_steps mws WHERE mws.workflow_id = mw.id)
              )
              FROM marketing_workflow_enrollments mwe
              INNER JOIN marketing_workflows mw ON mw.id = mwe.workflow_id
              WHERE mwe.contact_id = c.id AND mwe.status = 'active'
              ORDER BY mwe.enrolled_at DESC
              LIMIT 1
             ) as "activeAutomation",
             COUNT(*) OVER()::int as "totalCount"
      FROM contacts c
      WHERE c.account_id = ${p.accountId}::uuid
        AND (${p.type ?? null}::text IS NULL OR c.type = ${p.type ?? null})
        AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
        AND (${p.labelId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${p.labelId ?? null}::uuid
        ))
        AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
        AND (${p.marketingStatus ?? null}::text IS NULL OR c.marketing_status = ${p.marketingStatus ?? null})
        AND (${p.country ?? null}::text IS NULL OR c.country = ${p.country ?? null})
        AND (${p.hasAutomation ?? null}::text IS NULL OR
          (${p.hasAutomation ?? null}::text = 'yes') = EXISTS (
            SELECT 1 FROM marketing_workflow_enrollments mwe2
            WHERE mwe2.contact_id = c.id AND mwe2.status = 'active'
          )
        )
      ORDER BY c.last_activity_at ASC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return sql`
    SELECT c.id, c.name, c.email, c.phone, c.type, c.country, c.external_id as "externalId",
           c.marketing_status as "marketingStatus",
           c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
           c.created_at as "createdAt", c.updated_at as "updatedAt",
           COALESCE(
             (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name)
              FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
              WHERE cl.contact_id = c.id),
             '[]'::json
           ) as labels,
           (SELECT json_build_object(
              'name', mw.name,
              'currentStep', mwe.current_step_order,
              'totalSteps', (SELECT COUNT(*)::int FROM marketing_workflow_steps mws WHERE mws.workflow_id = mw.id)
            )
            FROM marketing_workflow_enrollments mwe
            INNER JOIN marketing_workflows mw ON mw.id = mwe.workflow_id
            WHERE mwe.contact_id = c.id AND mwe.status = 'active'
            ORDER BY mwe.enrolled_at DESC
            LIMIT 1
           ) as "activeAutomation",
           COUNT(*) OVER()::int as "totalCount"
    FROM contacts c
    WHERE c.account_id = ${p.accountId}::uuid
      AND (${p.type ?? null}::text IS NULL OR c.type = ${p.type ?? null})
      AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
      AND (${p.labelId ?? null}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${p.labelId ?? null}::uuid
      ))
      AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
      AND (${p.marketingStatus ?? null}::text IS NULL OR c.marketing_status = ${p.marketingStatus ?? null})
      AND (${p.country ?? null}::text IS NULL OR c.country = ${p.country ?? null})
      AND (${p.hasAutomation ?? null}::text IS NULL OR
        (${p.hasAutomation ?? null}::text = 'yes') = EXISTS (
          SELECT 1 FROM marketing_workflow_enrollments mwe2
          WHERE mwe2.contact_id = c.id AND mwe2.status = 'active'
        )
      )
    ORDER BY c.last_activity_at DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `;
}
