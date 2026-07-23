import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  isDasCatalogItemType,
  serializeDasCatalogComponent,
  type DasCatalogItemType,
} from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

async function catalogItemExists(
  sql: AppSql,
  accountId: string,
  itemType: DasCatalogItemType,
  itemId: string
) {
  if (itemType === 'product') {
    const rows = await sql`
      SELECT id FROM das_products
      WHERE id = ${itemId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    return Boolean(rows[0]);
  }
  const rows = await sql`
    SELECT id FROM das_services
    WHERE id = ${itemId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const parentType = url.searchParams.get('parentType')?.trim() ?? '';
  const parentId = url.searchParams.get('parentId')?.trim() ?? '';

  if (!isDasCatalogItemType(parentType)) {
    return Response.json({ error: 'parentType must be product or service' }, { status: 400 });
  }
  if (!parentId) {
    return Response.json({ error: 'parentId is required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      id,
      account_id as "accountId",
      parent_type as "parentType",
      parent_id as "parentId",
      child_type as "childType",
      child_id as "childId",
      quantity,
      label,
      sort_order as "sortOrder",
      created_at as "createdAt"
    FROM das_catalog_components
    WHERE account_id = ${accountId}::uuid
      AND parent_type = ${parentType}
      AND parent_id = ${parentId}::uuid
    ORDER BY sort_order ASC, created_at ASC
  `;

  return Response.json({
    components: rows.map((r) =>
      serializeDasCatalogComponent(
        r as Parameters<typeof serializeDasCatalogComponent>[0]
      )
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
    parentType?: string;
    parentId?: string;
    childType?: string;
    childId?: string;
    quantity?: number;
    label?: string | null;
    sortOrder?: number;
  };

  const parentType = body.parentType?.trim() ?? '';
  if (!isDasCatalogItemType(parentType)) {
    return Response.json({ error: 'parentType must be product or service' }, { status: 400 });
  }

  const parentId = body.parentId?.trim() ?? '';
  if (!parentId) {
    return Response.json({ error: 'parentId is required' }, { status: 400 });
  }

  const childType = body.childType?.trim() ?? '';
  if (!isDasCatalogItemType(childType)) {
    return Response.json({ error: 'childType must be product or service' }, { status: 400 });
  }

  const childId = body.childId?.trim() ?? '';
  if (!childId) {
    return Response.json({ error: 'childId is required' }, { status: 400 });
  }

  if (parentType === childType && parentId === childId) {
    return Response.json({ error: 'Component cannot reference itself' }, { status: 400 });
  }

  const quantity = Number(body.quantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return Response.json({ error: 'quantity must be a positive number' }, { status: 400 });
  }

  const sortOrder = Number(body.sortOrder ?? 0);
  if (!Number.isFinite(sortOrder)) {
    return Response.json({ error: 'sortOrder must be a number' }, { status: 400 });
  }

  const label = body.label?.trim() || null;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const parentExists = await catalogItemExists(sql, accountId, parentType, parentId);
  if (!parentExists) {
    return Response.json({ error: `parent ${parentType} not found` }, { status: 404 });
  }

  const childExists = await catalogItemExists(sql, accountId, childType, childId);
  if (!childExists) {
    return Response.json({ error: `child ${childType} not found` }, { status: 404 });
  }

  const rows = await sql`
    INSERT INTO das_catalog_components (
      account_id, parent_type, parent_id, child_type, child_id,
      quantity, label, sort_order
    )
    VALUES (
      ${accountId}::uuid,
      ${parentType},
      ${parentId}::uuid,
      ${childType},
      ${childId}::uuid,
      ${quantity},
      ${label},
      ${Math.trunc(sortOrder)}
    )
    RETURNING
      id,
      account_id as "accountId",
      parent_type as "parentType",
      parent_id as "parentId",
      child_type as "childType",
      child_id as "childId",
      quantity,
      label,
      sort_order as "sortOrder",
      created_at as "createdAt"
  `;

  const component = serializeDasCatalogComponent(
    rows[0] as Parameters<typeof serializeDasCatalogComponent>[0]
  );

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'catalog_component',
      ${component.id}::uuid,
      'created',
      ${auth.userId}::uuid,
      ${JSON.stringify({ parentType, parentId, childType, childId, quantity })}::jsonb
    )
  `;

  return Response.json({ component }, { status: 201 });
}
