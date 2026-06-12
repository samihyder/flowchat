import type { AppSql } from '@/lib/db-sql';
import { dispatchWebhooks } from '@/lib/webhooks';

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
             last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM contacts
      WHERE account_id = ${accountId}::uuid AND email = ${email}
      LIMIT 1
    `;
    existing = rows[0] as Record<string, unknown> | undefined;
  }

  if (existing) {
    const rows = await sql`
      UPDATE contacts SET
        name = ${input.name},
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        type = ${type},
        external_id = COALESCE(${externalId}, external_id),
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = ${existing.id as string}::uuid
      RETURNING id, name, email, phone, type, external_id as "externalId",
                last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const contact = serializeContactRow(rows[0] as Record<string, unknown>);
    await emitContactEvent(sql, accountId, 'contact.updated', contact);
    return { contact, created: false };
  }

  const rows = await sql`
    INSERT INTO contacts (account_id, name, email, phone, type, external_id, last_activity_at)
    VALUES (
      ${accountId}::uuid,
      ${input.name},
      ${email},
      ${phone},
      ${type},
      ${externalId},
      NOW()
    )
    RETURNING id, name, email, phone, type, external_id as "externalId",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const contact = serializeContactRow(rows[0] as Record<string, unknown>);
  await emitContactEvent(sql, accountId, 'contact.created', contact);
  return { contact, created: true };
}
