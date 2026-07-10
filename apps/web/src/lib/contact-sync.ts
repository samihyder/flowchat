import type { AppSql } from '@/lib/db-sql';
import { linkContactToGlobalCompany } from '@/lib/companies/resolve';
import { dispatchWebhooks } from '@/lib/webhooks';
import { dispatchEcosystemContactSync } from '@/lib/ecosystem-dispatch';

export type ContactRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  externalId: string | null;
  lastActivityAt: string | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

const VALID_TYPES = ['visitor', 'lead', 'customer'] as const;

export function serializeContactRow(row: Record<string, unknown>): ContactRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    type: row.type as string,
    externalId: (row.externalId as string | null) ?? (row.external_id as string | null) ?? null,
    lastActivityAt: row.lastActivityAt
      ? new Date(row.lastActivityAt as Date | string).toISOString()
      : null,
    isBlocked: Boolean(row.isBlocked),
    createdAt: new Date(row.createdAt as Date | string).toISOString(),
    updatedAt: new Date(row.updatedAt as Date | string).toISOString(),
  };
}

export async function emitContactEvent(
  sql: AppSql,
  accountId: string,
  event: 'contact.created' | 'contact.updated' | 'contact.deleted',
  contact: ContactRecord | { id: string }
) {
  void dispatchWebhooks(sql, accountId, event, { contact });
}

function mergeCustomAttributes(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!incoming || Object.keys(incoming).length === 0) {
    return existing ?? {};
  }
  return { ...(existing ?? {}), ...incoming };
}

export async function upsertIntegrationContact(
  sql: AppSql,
  accountId: string,
  input: {
    name: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    externalId?: string | null;
    matchByEmail?: boolean;
    matchByDomain?: boolean;
    customAttributes?: Record<string, unknown>;
  }
): Promise<{ contact: ContactRecord; created: boolean }> {
  const type =
    input.type && VALID_TYPES.includes(input.type as (typeof VALID_TYPES)[number])
      ? input.type
      : 'lead';
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  const externalId = input.externalId?.trim() || null;

  let existing: Record<string, unknown> | undefined;

  if (externalId) {
    const rows = await sql`
      SELECT id, name, email, phone, type, external_id as "externalId",
             custom_attributes as "customAttributes",
             last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM contacts
      WHERE account_id = ${accountId}::uuid AND external_id = ${externalId}
      LIMIT 1
    `;
    existing = rows[0] as Record<string, unknown> | undefined;
  }

  if (!existing && email && input.matchByEmail !== false) {
    const rows = await sql`
      SELECT id, name, email, phone, type, external_id as "externalId",
             custom_attributes as "customAttributes",
             last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM contacts
      WHERE account_id = ${accountId}::uuid AND email = ${email}
      LIMIT 1
    `;
    existing = rows[0] as Record<string, unknown> | undefined;
  }

  const domain = input.customAttributes?.domain;
  if (!existing && input.matchByDomain && domain && typeof domain === 'string') {
    const rows = await sql`
      SELECT id, name, email, phone, type, external_id as "externalId",
             custom_attributes as "customAttributes",
             last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM contacts
      WHERE account_id = ${accountId}::uuid
        AND custom_attributes->>'domain' = ${domain}
      LIMIT 1
    `;
    existing = rows[0] as Record<string, unknown> | undefined;
  }

  if (existing) {
    const mergedAttrs = mergeCustomAttributes(
      existing.customAttributes as Record<string, unknown> | undefined,
      input.customAttributes
    );
    const rows = await sql`
      UPDATE contacts SET
        name = ${input.name},
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        type = ${type},
        external_id = COALESCE(${externalId}, external_id),
        custom_attributes = ${JSON.stringify(mergedAttrs)}::jsonb,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = ${existing.id as string}::uuid
      RETURNING id, name, email, phone, type, external_id as "externalId",
                last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const contact = serializeContactRow(rows[0] as Record<string, unknown>);
    await linkContactToGlobalCompany(sql, contact.id, contact.email, accountId);
    await emitContactEvent(sql, accountId, 'contact.updated', contact);
    void dispatchEcosystemContactSync(sql, accountId, contact, false);
    return { contact, created: false };
  }

  const customAttributes = input.customAttributes ?? {};

  const rows = await sql`
    INSERT INTO contacts (account_id, name, email, phone, type, external_id, custom_attributes, last_activity_at)
    VALUES (
      ${accountId}::uuid,
      ${input.name},
      ${email},
      ${phone},
      ${type},
      ${externalId},
      ${JSON.stringify(customAttributes)}::jsonb,
      NOW()
    )
    RETURNING id, name, email, phone, type, external_id as "externalId",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const contact = serializeContactRow(rows[0] as Record<string, unknown>);
  await linkContactToGlobalCompany(sql, contact.id, contact.email, accountId);
  await emitContactEvent(sql, accountId, 'contact.created', contact);
  void dispatchEcosystemContactSync(sql, accountId, contact, true);
  return { contact, created: true };
}
