import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  isDasPriceMode,
  serializeDasCatalogItem,
  type DasPriceMode,
} from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; productId: string }> };

async function fetchProduct(sql: AppSql, accountId: string, productId: string) {
  const rows = await sql`
    SELECT
      id,
      account_id as "accountId",
      sku,
      sku_auto as "skuAuto",
      name,
      description,
      base_unit as "baseUnit",
      unit_price as "unitPrice",
      currency,
      price_mode as "priceMode",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM das_products
    WHERE id = ${productId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, productId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    sku?: string;
    skuAuto?: boolean;
    name?: string;
    description?: string | null;
    baseUnit?: string | null;
    unitPrice?: number;
    currency?: string;
    priceMode?: string;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await fetchProduct(sql, accountId, productId);
  if (!existing) {
    return Response.json({ error: 'Product not found' }, { status: 404 });
  }

  const current = serializeDasCatalogItem(
    existing as Parameters<typeof serializeDasCatalogItem>[0]
  );

  let nextSku = current.sku;
  if (body.sku !== undefined) {
    const trimmed = body.sku.trim();
    if (!trimmed) {
      return Response.json({ error: 'sku cannot be empty' }, { status: 400 });
    }
    nextSku = trimmed;
  }

  let nextName = current.name;
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return Response.json({ error: 'name cannot be empty' }, { status: 400 });
    }
    nextName = trimmed;
  }

  let nextPriceMode: DasPriceMode = current.priceMode;
  if (body.priceMode !== undefined) {
    if (!isDasPriceMode(body.priceMode)) {
      return Response.json({ error: 'priceMode must be fixed or rollup' }, { status: 400 });
    }
    nextPriceMode = body.priceMode;
  }

  let nextUnitPrice = current.unitPrice;
  if (body.unitPrice !== undefined) {
    const n = Number(body.unitPrice);
    if (!Number.isFinite(n) || n < 0) {
      return Response.json({ error: 'unitPrice must be a non-negative number' }, { status: 400 });
    }
    nextUnitPrice = n;
  }

  const nextSkuAuto = body.skuAuto !== undefined ? Boolean(body.skuAuto) : current.skuAuto;
  const nextDescription =
    body.description !== undefined
      ? body.description?.trim() || null
      : current.description;
  const nextBaseUnit =
    body.baseUnit !== undefined ? body.baseUnit?.trim() || null : current.baseUnit;
  const nextCurrency =
    body.currency !== undefined
      ? (body.currency.trim() || 'USD').toUpperCase().slice(0, 10)
      : current.currency;

  try {
    await sql`
      UPDATE das_products SET
        sku = ${nextSku},
        sku_auto = ${nextSkuAuto},
        name = ${nextName},
        description = ${nextDescription},
        base_unit = ${nextBaseUnit},
        unit_price = ${nextUnitPrice},
        currency = ${nextCurrency},
        price_mode = ${nextPriceMode},
        updated_at = NOW()
      WHERE id = ${productId}::uuid AND account_id = ${accountId}::uuid
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('unique') || message.includes('duplicate')) {
      return Response.json({ error: 'SKU already exists for this account' }, { status: 409 });
    }
    throw err;
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'product',
      ${productId}::uuid,
      'updated',
      ${auth.userId}::uuid,
      ${JSON.stringify({ sku: nextSku, name: nextName })}::jsonb
    )
  `;

  const row = await fetchProduct(sql, accountId, productId);
  return Response.json({
    product: serializeDasCatalogItem(
      row as Parameters<typeof serializeDasCatalogItem>[0]
    ),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, productId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM das_products
    WHERE id = ${productId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Product not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'product',
      ${productId}::uuid,
      'deleted',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ ok: true });
}
