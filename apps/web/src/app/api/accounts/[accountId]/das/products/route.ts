import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  autoSku,
  isDasPriceMode,
  serializeDasCatalogItem,
  type DasPriceMode,
} from '@/lib/das/types';
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
    WHERE account_id = ${accountId}::uuid
      AND (
        ${q ?? null}::text IS NULL
        OR name ILIKE '%' || ${q ?? ''} || '%'
        OR sku ILIKE '%' || ${q ?? ''} || '%'
      )
    ORDER BY name ASC
  `;

  return Response.json({
    products: rows.map((r) =>
      serializeDasCatalogItem(r as Parameters<typeof serializeDasCatalogItem>[0])
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
    sku?: string;
    skuAuto?: boolean;
    name?: string;
    description?: string | null;
    baseUnit?: string | null;
    unitPrice?: number;
    currency?: string;
    priceMode?: string;
  };

  const name = body.name?.trim() ?? '';
  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const skuAuto = body.skuAuto !== false;
  let sku = body.sku?.trim() ?? '';
  if (skuAuto || !sku) {
    sku = autoSku('PRD');
  }

  const priceMode = body.priceMode?.trim() ?? 'fixed';
  if (!isDasPriceMode(priceMode)) {
    return Response.json({ error: 'priceMode must be fixed or rollup' }, { status: 400 });
  }

  const unitPrice = Number(body.unitPrice ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return Response.json({ error: 'unitPrice must be a non-negative number' }, { status: 400 });
  }

  const currency = (body.currency?.trim() || 'USD').toUpperCase().slice(0, 10);
  const description = body.description?.trim() || null;
  const baseUnit = body.baseUnit?.trim() || null;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const rows = await sql`
      INSERT INTO das_products (
        account_id, sku, sku_auto, name, description, base_unit,
        unit_price, currency, price_mode
      )
      VALUES (
        ${accountId}::uuid,
        ${sku},
        ${skuAuto},
        ${name},
        ${description},
        ${baseUnit},
        ${unitPrice},
        ${currency},
        ${priceMode as DasPriceMode}
      )
      RETURNING
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
    `;

    const product = serializeDasCatalogItem(
      rows[0] as Parameters<typeof serializeDasCatalogItem>[0]
    );

    await sql`
      INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
      VALUES (
        ${accountId}::uuid,
        'product',
        ${product.id}::uuid,
        'created',
        ${auth.userId}::uuid,
        ${JSON.stringify({ sku, name })}::jsonb
      )
    `;

    return Response.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('unique') || message.includes('duplicate')) {
      return Response.json({ error: 'SKU already exists for this account' }, { status: 409 });
    }
    throw err;
  }
}
