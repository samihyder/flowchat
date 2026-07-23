import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  emptyDasBrandProfile,
  serializeDasBrandProfile,
} from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      account_id as "accountId",
      legal_name as "legalName",
      logo_url as "logoUrl",
      letterhead_url as "letterheadUrl",
      settings,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM das_brand_profiles
    WHERE account_id = ${accountId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) {
    return Response.json({ brand: emptyDasBrandProfile(accountId) });
  }

  return Response.json({
    brand: serializeDasBrandProfile(
      rows[0] as Parameters<typeof serializeDasBrandProfile>[0]
    ),
  });
}

export async function PUT(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    legalName?: string | null;
    logoUrl?: string | null;
    letterheadUrl?: string | null;
    settings?: Record<string, unknown>;
  };

  const legalName =
    body.legalName === undefined
      ? null
      : body.legalName === null
        ? null
        : String(body.legalName).trim() || null;
  const logoUrl =
    body.logoUrl === undefined
      ? null
      : body.logoUrl === null
        ? null
        : String(body.logoUrl).trim() || null;
  const letterheadUrl =
    body.letterheadUrl === undefined
      ? null
      : body.letterheadUrl === null
        ? null
        : String(body.letterheadUrl).trim() || null;
  const settings = body.settings && typeof body.settings === 'object' ? body.settings : {};

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  // Preserve existing fields when not provided
  const existing = await sql`
    SELECT
      legal_name as "legalName",
      logo_url as "logoUrl",
      letterhead_url as "letterheadUrl",
      settings
    FROM das_brand_profiles
    WHERE account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const prev = (existing[0] ?? null) as {
    legalName: string | null;
    logoUrl: string | null;
    letterheadUrl: string | null;
    settings: unknown;
  } | null;

  const nextLegalName = body.legalName !== undefined ? legalName : (prev?.legalName ?? null);
  const nextLogoUrl = body.logoUrl !== undefined ? logoUrl : (prev?.logoUrl ?? null);
  const nextLetterheadUrl =
    body.letterheadUrl !== undefined ? letterheadUrl : (prev?.letterheadUrl ?? null);
  const nextSettings =
    body.settings !== undefined
      ? settings
      : prev?.settings && typeof prev.settings === 'object'
        ? (prev.settings as Record<string, unknown>)
        : {};

  const rows = await sql`
    INSERT INTO das_brand_profiles (
      account_id, legal_name, logo_url, letterhead_url, settings, updated_at
    )
    VALUES (
      ${accountId}::uuid,
      ${nextLegalName},
      ${nextLogoUrl},
      ${nextLetterheadUrl},
      ${JSON.stringify(nextSettings)}::jsonb,
      NOW()
    )
    ON CONFLICT (account_id) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      logo_url = EXCLUDED.logo_url,
      letterhead_url = EXCLUDED.letterhead_url,
      settings = EXCLUDED.settings,
      updated_at = NOW()
    RETURNING
      account_id as "accountId",
      legal_name as "legalName",
      logo_url as "logoUrl",
      letterhead_url as "letterheadUrl",
      settings,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const brand = serializeDasBrandProfile(
    rows[0] as Parameters<typeof serializeDasBrandProfile>[0]
  );

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'brand',
      ${accountId}::uuid,
      'upserted',
      ${auth.userId}::uuid,
      ${JSON.stringify({
        legalName: brand.legalName,
        logoUrl: brand.logoUrl,
        letterheadUrl: brand.letterheadUrl,
      })}::jsonb
    )
  `;

  return Response.json({ brand });
}
