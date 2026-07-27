import type { AppSql } from '@/lib/db-sql';

export type SlaPolicy = {
  id: string;
  accountId: string;
  name: string;
  firstResponseMinutes: number | null;
  nextResponseMinutes: number | null;
  resolutionMinutes: number | null;
  useBusinessHours: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type PolicyRow = {
  id: string;
  accountId: string;
  name: string;
  firstResponseMinutes: number | null;
  nextResponseMinutes: number | null;
  resolutionMinutes: number | null;
  useBusinessHours: boolean;
  isEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: PolicyRow): SlaPolicy {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listSlaPolicies(sql: AppSql, accountId: string): Promise<SlaPolicy[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name,
           first_response_minutes as "firstResponseMinutes",
           next_response_minutes as "nextResponseMinutes",
           resolution_minutes as "resolutionMinutes",
           use_business_hours as "useBusinessHours",
           is_enabled as "isEnabled",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM sla_policies WHERE account_id = ${accountId}::uuid ORDER BY name
  `;
  return (rows as PolicyRow[]).map(serialize);
}

export async function getSlaPolicy(
  sql: AppSql,
  accountId: string,
  policyId: string
): Promise<SlaPolicy | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name,
           first_response_minutes as "firstResponseMinutes",
           next_response_minutes as "nextResponseMinutes",
           resolution_minutes as "resolutionMinutes",
           use_business_hours as "useBusinessHours",
           is_enabled as "isEnabled",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM sla_policies
    WHERE id = ${policyId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as PolicyRow | undefined;
  return row ? serialize(row) : null;
}

export async function createSlaPolicy(
  sql: AppSql,
  accountId: string,
  input: {
    name: string;
    firstResponseMinutes?: number | null;
    nextResponseMinutes?: number | null;
    resolutionMinutes?: number | null;
    useBusinessHours?: boolean;
    isEnabled?: boolean;
  }
): Promise<SlaPolicy> {
  const rows = await sql`
    INSERT INTO sla_policies (
      account_id, name, first_response_minutes, next_response_minutes,
      resolution_minutes, use_business_hours, is_enabled
    )
    VALUES (
      ${accountId}::uuid, ${input.name},
      ${input.firstResponseMinutes ?? null},
      ${input.nextResponseMinutes ?? null},
      ${input.resolutionMinutes ?? null},
      ${input.useBusinessHours ?? true},
      ${input.isEnabled ?? true}
    )
    RETURNING id, account_id as "accountId", name,
              first_response_minutes as "firstResponseMinutes",
              next_response_minutes as "nextResponseMinutes",
              resolution_minutes as "resolutionMinutes",
              use_business_hours as "useBusinessHours",
              is_enabled as "isEnabled",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serialize(rows[0] as PolicyRow);
}

export async function updateSlaPolicy(
  sql: AppSql,
  accountId: string,
  policyId: string,
  input: Partial<{
    name: string;
    firstResponseMinutes: number | null;
    nextResponseMinutes: number | null;
    resolutionMinutes: number | null;
    useBusinessHours: boolean;
    isEnabled: boolean;
  }>
): Promise<SlaPolicy | null> {
  const rows = await sql`
    UPDATE sla_policies SET
      name = COALESCE(${input.name ?? null}, name),
      first_response_minutes = COALESCE(${input.firstResponseMinutes ?? null}, first_response_minutes),
      next_response_minutes = COALESCE(${input.nextResponseMinutes ?? null}, next_response_minutes),
      resolution_minutes = COALESCE(${input.resolutionMinutes ?? null}, resolution_minutes),
      use_business_hours = COALESCE(${input.useBusinessHours ?? null}, use_business_hours),
      is_enabled = COALESCE(${input.isEnabled ?? null}, is_enabled),
      updated_at = NOW()
    WHERE id = ${policyId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name,
              first_response_minutes as "firstResponseMinutes",
              next_response_minutes as "nextResponseMinutes",
              resolution_minutes as "resolutionMinutes",
              use_business_hours as "useBusinessHours",
              is_enabled as "isEnabled",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as PolicyRow | undefined;
  return row ? serialize(row) : null;
}

export async function deleteSlaPolicy(
  sql: AppSql,
  accountId: string,
  policyId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM sla_policies
    WHERE id = ${policyId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function attachSlaToInbox(
  sql: AppSql,
  accountId: string,
  inboxId: string,
  policyId: string
): Promise<void> {
  const inbox = await sql`
    SELECT id FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!inbox[0]) throw new Error('Inbox not found');
  const policy = await getSlaPolicy(sql, accountId, policyId);
  if (!policy) throw new Error('SLA policy not found');

  await sql`
    INSERT INTO inbox_sla_policies (inbox_id, sla_policy_id)
    VALUES (${inboxId}::uuid, ${policyId}::uuid)
    ON CONFLICT (inbox_id) DO UPDATE SET sla_policy_id = ${policyId}::uuid
  `;
}

export async function getInboxSlaPolicy(
  sql: AppSql,
  accountId: string,
  inboxId: string
): Promise<SlaPolicy | null> {
  const rows = await sql`
    SELECT p.id, p.account_id as "accountId", p.name,
           p.first_response_minutes as "firstResponseMinutes",
           p.next_response_minutes as "nextResponseMinutes",
           p.resolution_minutes as "resolutionMinutes",
           p.use_business_hours as "useBusinessHours",
           p.is_enabled as "isEnabled",
           p.created_at as "createdAt", p.updated_at as "updatedAt"
    FROM inbox_sla_policies isp
    INNER JOIN sla_policies p ON p.id = isp.sla_policy_id
    WHERE isp.inbox_id = ${inboxId}::uuid AND p.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as PolicyRow | undefined;
  return row ? serialize(row) : null;
}

export async function computeConversationSlaDeadlines(
  sql: AppSql,
  accountId: string,
  conversationId: string
): Promise<void> {
  const conv = await sql`
    SELECT id, inbox_id as "inboxId", created_at as "createdAt"
    FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = conv[0] as { id: string; inboxId: string; createdAt: Date | string } | undefined;
  if (!row) return;

  const policy = await getInboxSlaPolicy(sql, accountId, row.inboxId);
  if (!policy || !policy.isEnabled) return;

  const base = new Date(row.createdAt).getTime();
  const firstDue = policy.firstResponseMinutes
    ? new Date(base + policy.firstResponseMinutes * 60_000).toISOString()
    : null;
  const nextDue = policy.nextResponseMinutes
    ? new Date(base + policy.nextResponseMinutes * 60_000).toISOString()
    : null;
  const resolutionDue = policy.resolutionMinutes
    ? new Date(base + policy.resolutionMinutes * 60_000).toISOString()
    : null;

  await sql`
    INSERT INTO conversation_sla_deadlines (
      conversation_id, account_id,
      first_response_due_at, next_response_due_at, resolution_due_at
    )
    VALUES (
      ${conversationId}::uuid, ${accountId}::uuid,
      ${firstDue}::timestamptz, ${nextDue}::timestamptz, ${resolutionDue}::timestamptz
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
      first_response_due_at = COALESCE(${firstDue}::timestamptz, conversation_sla_deadlines.first_response_due_at),
      next_response_due_at = COALESCE(${nextDue}::timestamptz, conversation_sla_deadlines.next_response_due_at),
      resolution_due_at = COALESCE(${resolutionDue}::timestamptz, conversation_sla_deadlines.resolution_due_at),
      updated_at = NOW()
  `;
}

export async function checkSlaBreaches(sql: AppSql): Promise<number> {
  const breached = await sql`
    UPDATE conversation_sla_deadlines SET
      first_response_breached_at = CASE
        WHEN first_response_due_at IS NOT NULL
          AND first_response_due_at < NOW()
          AND first_response_breached_at IS NULL
        THEN NOW() ELSE first_response_breached_at
      END,
      next_response_breached_at = CASE
        WHEN next_response_due_at IS NOT NULL
          AND next_response_due_at < NOW()
          AND next_response_breached_at IS NULL
        THEN NOW() ELSE next_response_breached_at
      END,
      resolution_breached_at = CASE
        WHEN resolution_due_at IS NOT NULL
          AND resolution_due_at < NOW()
          AND resolution_breached_at IS NULL
        THEN NOW() ELSE resolution_breached_at
      END,
      updated_at = NOW()
    WHERE (
      (first_response_due_at < NOW() AND first_response_breached_at IS NULL)
      OR (next_response_due_at < NOW() AND next_response_breached_at IS NULL)
      OR (resolution_due_at < NOW() AND resolution_breached_at IS NULL)
    )
    RETURNING conversation_id
  `;
  return breached.length;
}
