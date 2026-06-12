import type { AppSql } from '@/lib/db-sql';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';

export type DuplicateGroup = {
  key: string;
  field: 'email' | 'phone';
  value: string;
  contacts: { id: string; name: string; email: string | null; phone: string | null }[];
};

export async function findDuplicateGroups(sql: AppSql, accountId: string): Promise<DuplicateGroup[]> {
  const byEmail = await sql`
    SELECT email as value,
           json_agg(json_build_object('id', id, 'name', name, 'email', email, 'phone', phone) ORDER BY created_at ASC) as contacts
    FROM contacts
    WHERE account_id = ${accountId}::uuid AND email IS NOT NULL AND email <> ''
    GROUP BY email
    HAVING COUNT(*) > 1
  `;

  const byPhone = await sql`
    SELECT phone as value,
           json_agg(json_build_object('id', id, 'name', name, 'email', email, 'phone', phone) ORDER BY created_at ASC) as contacts
    FROM contacts
    WHERE account_id = ${accountId}::uuid AND phone IS NOT NULL AND phone <> ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  `;

  const groups: DuplicateGroup[] = [];

  for (const row of byEmail as { value: string; contacts: DuplicateGroup['contacts'] }[]) {
    groups.push({
      key: `email:${row.value}`,
      field: 'email',
      value: row.value,
      contacts: row.contacts,
    });
  }

  for (const row of byPhone as { value: string; contacts: DuplicateGroup['contacts'] }[]) {
    groups.push({
      key: `phone:${row.value}`,
      field: 'phone',
      value: row.value,
      contacts: row.contacts,
    });
  }

  return groups;
}

export async function mergeContacts(
  sql: AppSql,
  accountId: string,
  primaryId: string,
  secondaryId: string
): Promise<{ contact: Record<string, unknown> }> {
  if (primaryId === secondaryId) {
    throw new Error('Cannot merge a contact with itself');
  }

  const rows = await sql`
    SELECT id, name, email, phone, type, external_id as "externalId",
           custom_attributes as "customAttributes",
           last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM contacts
    WHERE account_id = ${accountId}::uuid AND id IN (${primaryId}::uuid, ${secondaryId}::uuid)
  `;

  const primary = rows.find((r) => (r as { id: string }).id === primaryId) as
    | Record<string, unknown>
    | undefined;
  const secondary = rows.find((r) => (r as { id: string }).id === secondaryId) as
    | Record<string, unknown>
    | undefined;

  if (!primary || !secondary) {
    throw new Error('One or both contacts not found');
  }

  const primaryAttrs = (primary.customAttributes as Record<string, unknown>) ?? {};
  const secondaryAttrs = (secondary.customAttributes as Record<string, unknown>) ?? {};
  const mergedAttrs = { ...secondaryAttrs, ...primaryAttrs };

  const mergedName = (primary.name as string) || (secondary.name as string);
  const mergedEmail = (primary.email as string | null) ?? (secondary.email as string | null);
  const mergedPhone = (primary.phone as string | null) ?? (secondary.phone as string | null);
  const mergedExternalId =
    (primary.externalId as string | null) ?? (secondary.externalId as string | null);

  const primaryTs = primary.lastActivityAt
    ? new Date(primary.lastActivityAt as Date | string).getTime()
    : 0;
  const secondaryTs = secondary.lastActivityAt
    ? new Date(secondary.lastActivityAt as Date | string).getTime()
    : 0;
  const maxTs = Math.max(primaryTs, secondaryTs);
  const mergedLastActivity = maxTs > 0 ? new Date(maxTs).toISOString() : null;

  await sql`UPDATE conversations SET contact_id = ${primaryId}::uuid WHERE contact_id = ${secondaryId}::uuid`;
  await sql`UPDATE contact_inboxes SET contact_id = ${primaryId}::uuid WHERE contact_id = ${secondaryId}::uuid`;
  await sql`UPDATE contact_notes SET contact_id = ${primaryId}::uuid WHERE contact_id = ${secondaryId}::uuid`;

  await sql`
    INSERT INTO contact_labels (contact_id, label_id)
    SELECT ${primaryId}::uuid, label_id FROM contact_labels WHERE contact_id = ${secondaryId}::uuid
    ON CONFLICT DO NOTHING
  `;
  await sql`DELETE FROM contact_labels WHERE contact_id = ${secondaryId}::uuid`;

  const updated = await sql`
    UPDATE contacts SET
      name = ${mergedName},
      email = ${mergedEmail},
      phone = ${mergedPhone},
      external_id = COALESCE(external_id, ${mergedExternalId}),
      custom_attributes = ${JSON.stringify(mergedAttrs)}::jsonb,
      last_activity_at = COALESCE(${mergedLastActivity}::timestamptz, last_activity_at),
      updated_at = NOW()
    WHERE id = ${primaryId}::uuid
    RETURNING id, name, email, phone, type, external_id as "externalId",
              custom_attributes as "customAttributes",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;

  await sql`DELETE FROM contacts WHERE id = ${secondaryId}::uuid AND account_id = ${accountId}::uuid`;

  if (updated[0]) {
    await emitContactEvent(
      sql,
      accountId,
      'contact.updated',
      serializeContactRow(updated[0] as Record<string, unknown>)
    );
  }
  await emitContactEvent(sql, accountId, 'contact.deleted', { id: secondaryId });

  return { contact: updated[0] as Record<string, unknown> };
}
