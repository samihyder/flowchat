import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDefinitionRow, slugifyAttributeKey } from '@/lib/custom-attributes';

type Params = { params: Promise<{ accountId: string }> };

const VALID_TYPES = ['text', 'number', 'date', 'select', 'boolean'] as const;
const VALID_ENTITIES = ['contact', 'conversation'] as const;

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const entityType = url.searchParams.get('entityType') ?? 'contact';

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, entity_type as "entityType", key, label,
           attr_type as "attrType", options, sort_order as "sortOrder", required
    FROM custom_attribute_definitions
    WHERE account_id = ${accountId}::uuid AND entity_type = ${entityType}
    ORDER BY sort_order ASC, label ASC
  `;

  return Response.json({
    definitions: (rows as Record<string, unknown>[]).map(serializeDefinitionRow),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    label?: string;
    key?: string;
    entityType?: string;
    attrType?: string;
    options?: string[];
    sortOrder?: number;
    required?: boolean;
  };

  const label = body.label?.trim();
  if (!label) return Response.json({ error: 'Label is required' }, { status: 400 });

  const entityType = body.entityType ?? 'contact';
  if (!VALID_ENTITIES.includes(entityType as (typeof VALID_ENTITIES)[number])) {
    return Response.json({ error: 'Invalid entity type' }, { status: 400 });
  }

  const attrType = body.attrType ?? 'text';
  if (!VALID_TYPES.includes(attrType as (typeof VALID_TYPES)[number])) {
    return Response.json({ error: 'Invalid attribute type' }, { status: 400 });
  }

  const key = (body.key?.trim() || slugifyAttributeKey(label)).slice(0, 100);
  if (!key) return Response.json({ error: 'Invalid attribute key' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    INSERT INTO custom_attribute_definitions (account_id, entity_type, key, label, attr_type, options, sort_order, required)
    VALUES (
      ${accountId}::uuid,
      ${entityType},
      ${key},
      ${label},
      ${attrType},
      ${body.options ? JSON.stringify(body.options) : null}::jsonb,
      ${body.sortOrder ?? 0},
      ${body.required ?? false}
    )
    ON CONFLICT (account_id, entity_type, key) DO UPDATE SET
      label = EXCLUDED.label,
      attr_type = EXCLUDED.attr_type,
      options = EXCLUDED.options,
      sort_order = EXCLUDED.sort_order,
      required = EXCLUDED.required
    RETURNING id, entity_type as "entityType", key, label,
              attr_type as "attrType", options, sort_order as "sortOrder", required
  `;

  return Response.json(
    { definition: serializeDefinitionRow(rows[0] as Record<string, unknown>) },
    { status: 201 }
  );
}
