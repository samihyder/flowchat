import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDefinitionRow } from '@/lib/custom-attributes';

type Params = { params: Promise<{ accountId: string; definitionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, definitionId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    label?: string;
    options?: string[];
    sortOrder?: number;
    required?: boolean;
  };

  const label = body.label?.trim();
  if (body.label !== undefined && !label) {
    return Response.json({ error: 'Label cannot be empty' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    UPDATE custom_attribute_definitions SET
      label = COALESCE(${label ?? null}, label),
      options = CASE WHEN ${body.options !== undefined} THEN ${body.options ? JSON.stringify(body.options) : null}::jsonb ELSE options END,
      sort_order = COALESCE(${body.sortOrder ?? null}, sort_order),
      required = COALESCE(${body.required ?? null}, required)
    WHERE id = ${definitionId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, entity_type as "entityType", key, label,
              attr_type as "attrType", options, sort_order as "sortOrder", required
  `;
  if (!rows[0]) return Response.json({ error: 'Definition not found' }, { status: 404 });

  return Response.json({ definition: serializeDefinitionRow(rows[0] as Record<string, unknown>) });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, definitionId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    DELETE FROM custom_attribute_definitions
    WHERE id = ${definitionId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!result[0]) return Response.json({ error: 'Definition not found' }, { status: 404 });

  return Response.json({ ok: true });
}
