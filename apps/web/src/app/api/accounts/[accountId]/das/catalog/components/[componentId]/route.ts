import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDasCatalogComponent } from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; componentId: string }> };

async function fetchComponent(sql: AppSql, accountId: string, componentId: string) {
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
    WHERE id = ${componentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, componentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    quantity?: number;
    label?: string | null;
    sortOrder?: number;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await fetchComponent(sql, accountId, componentId);
  if (!existing) {
    return Response.json({ error: 'Component not found' }, { status: 404 });
  }

  const current = serializeDasCatalogComponent(
    existing as Parameters<typeof serializeDasCatalogComponent>[0]
  );

  let nextQuantity = current.quantity;
  if (body.quantity !== undefined) {
    const n = Number(body.quantity);
    if (!Number.isFinite(n) || n <= 0) {
      return Response.json({ error: 'quantity must be a positive number' }, { status: 400 });
    }
    nextQuantity = n;
  }

  let nextSortOrder = current.sortOrder;
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n)) {
      return Response.json({ error: 'sortOrder must be a number' }, { status: 400 });
    }
    nextSortOrder = Math.trunc(n);
  }

  const nextLabel =
    body.label !== undefined ? body.label?.trim() || null : current.label;

  await sql`
    UPDATE das_catalog_components SET
      quantity = ${nextQuantity},
      label = ${nextLabel},
      sort_order = ${nextSortOrder}
    WHERE id = ${componentId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'catalog_component',
      ${componentId}::uuid,
      'updated',
      ${auth.userId}::uuid,
      ${JSON.stringify({
        quantity: nextQuantity,
        label: nextLabel,
        sortOrder: nextSortOrder,
      })}::jsonb
    )
  `;

  const row = await fetchComponent(sql, accountId, componentId);
  return Response.json({
    component: serializeDasCatalogComponent(
      row as Parameters<typeof serializeDasCatalogComponent>[0]
    ),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, componentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM das_catalog_components
    WHERE id = ${componentId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Component not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'catalog_component',
      ${componentId}::uuid,
      'deleted',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ ok: true });
}
