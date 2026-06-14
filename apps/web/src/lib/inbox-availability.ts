import type { AppSql } from '@/lib/db-sql';
import { isWithinBusinessHours, parseBusinessHours } from '@/lib/business-hours';

export type InboxAvailability = {
  available: boolean;
  withinBusinessHours: boolean;
  agentsOnline: boolean;
};

export const DEFAULT_OFFLINE_MESSAGE =
  'We are currently offline. Leave your message and we will get back to you soon.';

export const DEFAULT_OFFLINE_RECEIPT =
  'Your message has been received. We will reply as soon as we are back online.';

type InboxAvailabilityInput = {
  useBusinessHours: boolean;
  businessHours: unknown;
  timezone: string;
};

export async function countOnlineAgents(sql: AppSql, accountId: string): Promise<number> {
  const agentsOnline = (await sql`
    SELECT COUNT(*)::int as count FROM account_users au
    WHERE au.account_id = ${accountId}::uuid AND au.status = 'active' AND au.availability = 'online'
  `) as { count: number }[];
  return agentsOnline[0]?.count ?? 0;
}

export function resolveInboxAvailability(
  inbox: InboxAvailabilityInput,
  agentsOnlineCount: number
): InboxAvailability {
  const hours = parseBusinessHours(inbox.businessHours, inbox.timezone);
  const withinBusinessHours = inbox.useBusinessHours
    ? isWithinBusinessHours(hours, inbox.timezone)
    : true;
  const agentsOnline = agentsOnlineCount > 0;

  return {
    available: withinBusinessHours && agentsOnline,
    withinBusinessHours,
    agentsOnline,
  };
}

export async function getInboxAvailability(
  sql: AppSql,
  inboxId: string,
  accountId: string,
  inbox?: InboxAvailabilityInput
): Promise<InboxAvailability> {
  let row = inbox;
  if (!row) {
    const rows = (await sql`
      SELECT i.use_business_hours as "useBusinessHours",
             i.business_hours as "businessHours",
             a.timezone
      FROM inboxes i
      INNER JOIN accounts a ON a.id = i.account_id
      WHERE i.id = ${inboxId}::uuid AND i.account_id = ${accountId}::uuid
      LIMIT 1
    `) as InboxAvailabilityInput[];
    row = rows[0];
  }
  if (!row) {
    return { available: true, withinBusinessHours: true, agentsOnline: true };
  }

  const onlineCount = await countOnlineAgents(sql, accountId);
  return resolveInboxAvailability(row, onlineCount);
}
