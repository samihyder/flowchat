import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDasClient } from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; clientId: string }> };

async function fetchClient(sql: AppSql, accountId: string, clientId: string) {
  const rows = await sql`
    SELECT
      id,
      account_id as "accountId",
      contact_id as "contactId",
      name,
      email,
      phone,
      company,
      address,
      notes,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM das_clients
    WHERE id = ${clientId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, clientId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    address?: string | null;
    notes?: string | null;
    contactId?: string | null;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await fetchClient(sql, accountId, clientId);
  if (!existing) {
    return Response.json({ error: 'Client not found' }, { status: 404 });
  }

  const current = serializeDasClient(
    existing as Parameters<typeof serializeDasClient>[0]
  );

  let nextName = current.name;
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return Response.json({ error: 'name cannot be empty' }, { status: 400 });
    }
    nextName = trimmed;
  }

  let nextContactId = current.contactId;
  if (body.contactId !== undefined) {
    if (body.contactId) {
      const contacts = await sql`
        SELECT id FROM contacts
        WHERE id = ${body.contactId}::uuid AND account_id = ${accountId}::uuid
        LIMIT 1
      `;
      if (!contacts[0]) {
        return Response.json({ error: 'Contact not found' }, { status: 404 });
      }
      nextContactId = body.contactId;
    } else {
      nextContactId = null;
    }
  }

  const nextEmail =
    body.email !== undefined ? body.email?.trim() || null : current.email;
  const nextPhone =
    body.phone !== undefined ? body.phone?.trim() || null : current.phone;
  const nextCompany =
    body.company !== undefined ? body.company?.trim() || null : current.company;
  const nextAddress =
    body.address !== undefined ? body.address?.trim() || null : current.address;
  const nextNotes =
    body.notes !== undefined ? body.notes?.trim() || null : current.notes;

  await sql`
    UPDATE das_clients SET
      name = ${nextName},
      email = ${nextEmail},
      phone = ${nextPhone},
      company = ${nextCompany},
      address = ${nextAddress},
      notes = ${nextNotes},
      contact_id = ${nextContactId}::uuid,
      updated_at = NOW()
    WHERE id = ${clientId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'client',
      ${clientId}::uuid,
      'updated',
      ${auth.userId}::uuid,
      ${JSON.stringify({ name: nextName })}::jsonb
    )
  `;

  const row = await fetchClient(sql, accountId, clientId);
  return Response.json({
    client: serializeDasClient(row as Parameters<typeof serializeDasClient>[0]),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, clientId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM das_clients
    WHERE id = ${clientId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Client not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'client',
      ${clientId}::uuid,
      'deleted',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ ok: true });
}
