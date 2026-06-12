import { requireIntegrationAuth } from '@/lib/integration-auth';
import { serializeContactRow, upsertIntegrationContact } from '@/lib/contact-sync';

/** Public integration API — list and create/upsert contacts (server-to-server). */
export async function GET(req: Request) {
  const gate = await requireIntegrationAuth(req, 'contacts:read');
  if (!gate.ok) return gate.response;

  const { auth, sql } = gate;
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const externalId = url.searchParams.get('externalId')?.trim();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
  const pattern = q ? `%${q}%` : null;

  const rows = externalId
    ? await sql`
        SELECT id, name, email, phone, type, external_id as "externalId",
               last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM contacts
        WHERE account_id = ${auth.accountId}::uuid AND external_id = ${externalId}
        LIMIT 1
      `
    : await sql`
        SELECT id, name, email, phone, type, external_id as "externalId",
               last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM contacts
        WHERE account_id = ${auth.accountId}::uuid
          AND (${pattern ?? null}::text IS NULL OR name ILIKE ${pattern} OR email ILIKE ${pattern})
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  const contacts = (rows as Record<string, unknown>[]).map(serializeContactRow);
  return Response.json({ contacts });
}

export async function POST(req: Request) {
  const gate = await requireIntegrationAuth(req, 'contacts:write');
  if (!gate.ok) return gate.response;

  const body = (await req.json()) as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    externalId?: string | null;
    upsert?: boolean;
  };

  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

  const { auth, sql } = gate;

  const result = await upsertIntegrationContact(sql, auth.accountId, {
    name,
    email: body.email,
    phone: body.phone,
    type: body.type,
    externalId: body.externalId,
    matchByEmail: body.upsert !== false,
  });
  return Response.json(
    { contact: result.contact, created: result.created },
    { status: result.created ? 201 : 200 }
  );
}
