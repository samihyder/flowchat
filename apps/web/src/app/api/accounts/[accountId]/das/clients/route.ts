import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDasClient } from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
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
    WHERE account_id = ${accountId}::uuid
      AND (
        ${q ?? null}::text IS NULL
        OR name ILIKE '%' || ${q ?? ''} || '%'
        OR email ILIKE '%' || ${q ?? ''} || '%'
        OR company ILIKE '%' || ${q ?? ''} || '%'
      )
    ORDER BY name ASC
  `;

  return Response.json({
    clients: rows.map((r) =>
      serializeDasClient(r as Parameters<typeof serializeDasClient>[0])
    ),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
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

  const name = body.name?.trim() ?? '';
  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.contactId) {
    const contacts = await sql`
      SELECT id FROM contacts
      WHERE id = ${body.contactId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    if (!contacts[0]) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }
  }

  const rows = await sql`
    INSERT INTO das_clients (
      account_id, contact_id, name, email, phone, company, address, notes
    )
    VALUES (
      ${accountId}::uuid,
      ${body.contactId ?? null}::uuid,
      ${name},
      ${body.email?.trim() || null},
      ${body.phone?.trim() || null},
      ${body.company?.trim() || null},
      ${body.address?.trim() || null},
      ${body.notes?.trim() || null}
    )
    RETURNING
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
  `;

  const client = serializeDasClient(rows[0] as Parameters<typeof serializeDasClient>[0]);

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'client',
      ${client.id}::uuid,
      'created',
      ${auth.userId}::uuid,
      ${JSON.stringify({ name })}::jsonb
    )
  `;

  return Response.json({ client }, { status: 201 });
}
