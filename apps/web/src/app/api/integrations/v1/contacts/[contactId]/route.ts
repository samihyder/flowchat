import { requireIntegrationAuth } from '@/lib/integration-auth';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';

type Params = { params: Promise<{ contactId: string }> };

export async function GET(req: Request, { params }: Params) {
  const gate = await requireIntegrationAuth(req, 'contacts:read');
  if (!gate.ok) return gate.response;

  const { contactId } = await params;
  const { auth, sql } = gate;

  const rows = await sql`
    SELECT id, name, email, phone, type, external_id as "externalId",
           last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM contacts
    WHERE id = ${contactId}::uuid AND account_id = ${auth.accountId}::uuid
    LIMIT 1
  `;
  if (!rows[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  return Response.json({ contact: serializeContactRow(rows[0] as Record<string, unknown>) });
}

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireIntegrationAuth(req, 'contacts:write');
  if (!gate.ok) return gate.response;

  const { contactId } = await params;
  const body = (await req.json()) as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    externalId?: string | null;
  };

  const { auth, sql } = gate;
  const rows = await sql`
    UPDATE contacts SET
      name = COALESCE(${body.name?.trim() ?? null}, name),
      email = CASE WHEN ${body.email !== undefined} THEN ${body.email?.trim() || null} ELSE email END,
      phone = CASE WHEN ${body.phone !== undefined} THEN ${body.phone?.trim() || null} ELSE phone END,
      type = COALESCE(${body.type ?? null}, type),
      external_id = CASE WHEN ${body.externalId !== undefined} THEN ${body.externalId?.trim() || null} ELSE external_id END,
      updated_at = NOW()
    WHERE id = ${contactId}::uuid AND account_id = ${auth.accountId}::uuid
    RETURNING id, name, email, phone, type, external_id as "externalId",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  const contact = serializeContactRow(rows[0] as Record<string, unknown>);
  await emitContactEvent(sql, auth.accountId, 'contact.updated', contact);
  return Response.json({ contact });
}

export async function DELETE(req: Request, { params }: Params) {
  const gate = await requireIntegrationAuth(req, 'contacts:write');
  if (!gate.ok) return gate.response;

  const { contactId } = await params;
  const { auth, sql } = gate;

  const rows = await sql`
    DELETE FROM contacts
    WHERE id = ${contactId}::uuid AND account_id = ${auth.accountId}::uuid
    RETURNING id
  `;
  if (!rows[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  await emitContactEvent(sql, auth.accountId, 'contact.deleted', { id: contactId });
  return Response.json({ ok: true });
}
