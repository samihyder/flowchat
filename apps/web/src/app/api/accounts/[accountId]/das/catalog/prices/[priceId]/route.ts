import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDasCatalogPrice } from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; priceId: string }> };

async function fetchPrice(sql: AppSql, accountId: string, priceId: string) {
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
    WHERE id = ${priceId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, priceId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    currency?: string;
    unitPrice?: number;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await fetchPrice(sql, accountId, priceId);
  if (!existing) {
    return Response.json({ error: 'Price not found' }, { status: 404 });
  }

  const current = serializeDasCatalogPrice(
    existing as Parameters<typeof serializeDasCatalogPrice>[0]
  );

  let nextCurrency = current.currency;
  if (body.currency !== undefined) {
    const trimmed = body.currency.trim().toUpperCase().slice(0, 10);
    if (!trimmed) {
      return Response.json({ error: 'currency cannot be empty' }, { status: 400 });
    }
    nextCurrency = trimmed;
  }

  let nextUnitPrice = current.unitPrice;
  if (body.unitPrice !== undefined) {
    const n = Number(body.unitPrice);
    if (!Number.isFinite(n) || n < 0) {
      return Response.json({ error: 'unitPrice must be a non-negative number' }, { status: 400 });
    }
    nextUnitPrice = n;
  }

  try {
    await sql`
      UPDATE das_catalog_prices SET
        currency = ${nextCurrency},
        unit_price = ${nextUnitPrice}
      WHERE id = ${priceId}::uuid AND account_id = ${accountId}::uuid
    `;
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

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'catalog_price',
      ${priceId}::uuid,
      'updated',
      ${auth.userId}::uuid,
      ${JSON.stringify({ currency: nextCurrency, unitPrice: nextUnitPrice })}::jsonb
    )
  `;

  const row = await fetchPrice(sql, accountId, priceId);
  return Response.json({
    price: serializeDasCatalogPrice(
      row as Parameters<typeof serializeDasCatalogPrice>[0]
    ),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, priceId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM das_catalog_prices
    WHERE id = ${priceId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Price not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'catalog_price',
      ${priceId}::uuid,
      'deleted',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ ok: true });
}
