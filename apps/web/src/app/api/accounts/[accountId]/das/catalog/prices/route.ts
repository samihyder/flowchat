import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  isDasCatalogItemType,
  serializeDasCatalogPrice,
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
  const itemType = url.searchParams.get('itemType')?.trim() ?? '';
  const itemId = url.searchParams.get('itemId')?.trim() ?? '';

  if (!isDasCatalogItemType(itemType)) {
    return Response.json({ error: 'itemType must be product or service' }, { status: 400 });
  }
  if (!itemId) {
    return Response.json({ error: 'itemId is required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      id,
      account_id as "accountId",
      item_type as "itemType",
      item_id as "itemId",
      currency,
      unit_price as "unitPrice",
      created_at as "createdAt"
    FROM das_catalog_prices
    WHERE account_id = ${accountId}::uuid
      AND item_type = ${itemType}
      AND item_id = ${itemId}::uuid
    ORDER BY currency ASC
  `;

  return Response.json({
    prices: rows.map((r) =>
      serializeDasCatalogPrice(r as Parameters<typeof serializeDasCatalogPrice>[0])
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
    itemType?: string;
    itemId?: string;
    currency?: string;
    unitPrice?: number;
  };

  const itemType = body.itemType?.trim() ?? '';
  if (!isDasCatalogItemType(itemType)) {
    return Response.json({ error: 'itemType must be product or service' }, { status: 400 });
  }

  const itemId = body.itemId?.trim() ?? '';
  if (!itemId) {
    return Response.json({ error: 'itemId is required' }, { status: 400 });
  }

  const currency = (body.currency?.trim() || '').toUpperCase().slice(0, 10);
  if (!currency) {
    return Response.json({ error: 'currency is required' }, { status: 400 });
  }

  const unitPrice = Number(body.unitPrice ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return Response.json({ error: 'unitPrice must be a non-negative number' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const exists = await catalogItemExists(sql, accountId, itemType, itemId);
  if (!exists) {
    return Response.json({ error: `${itemType} not found` }, { status: 404 });
  }

  try {
    const rows = await sql`
      INSERT INTO das_catalog_prices (
        account_id, item_type, item_id, currency, unit_price
      )
      VALUES (
        ${accountId}::uuid,
        ${itemType},
        ${itemId}::uuid,
        ${currency},
        ${unitPrice}
      )
      RETURNING
        id,
        account_id as "accountId",
        item_type as "itemType",
        item_id as "itemId",
        currency,
        unit_price as "unitPrice",
        created_at as "createdAt"
    `;

    const price = serializeDasCatalogPrice(
      rows[0] as Parameters<typeof serializeDasCatalogPrice>[0]
    );

    await sql`
      INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
      VALUES (
        ${accountId}::uuid,
        'catalog_price',
        ${price.id}::uuid,
        'created',
        ${auth.userId}::uuid,
        ${JSON.stringify({ itemType, itemId, currency, unitPrice })}::jsonb
      )
    `;

    return Response.json({ price }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('unique') || message.includes('duplicate')) {
      return Response.json(
        { error: 'Price already exists for this currency' },
        { status: 409 }
      );
    }
    throw err;
  }
}
