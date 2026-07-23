import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isDasAssetKind, serializeDasAsset } from '@/lib/das/types';
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
      id,
      account_id as "accountId",
      owner_user_id as "ownerUserId",
      kind,
      label,
      file_name as "fileName",
      mime_type as "mimeType",
      storage_key as "storageKey",
      public_url as "publicUrl",
      signer_name as "signerName",
      signer_title as "signerTitle",
      tags,
      created_at as "createdAt"
    FROM das_assets
    WHERE account_id = ${accountId}::uuid
    ORDER BY created_at DESC
  `;

  return Response.json({
    assets: rows.map((r) =>
      serializeDasAsset(r as Parameters<typeof serializeDasAsset>[0])
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
    kind?: string;
    label?: string;
    fileName?: string;
    mimeType?: string;
    storageKey?: string;
    publicUrl?: string;
    signerName?: string | null;
    signerTitle?: string | null;
    tags?: unknown[];
  };

  const kind = body.kind?.trim() ?? '';
  const label = body.label?.trim() ?? '';
  const fileName = body.fileName?.trim() ?? '';
  const mimeType = body.mimeType?.trim() ?? '';
  const storageKey = body.storageKey?.trim() || null;
  const publicUrl = body.publicUrl?.trim() || null;

  if (!kind || !label || !fileName || !mimeType) {
    return Response.json(
      { error: 'kind, label, fileName, and mimeType are required' },
      { status: 400 }
    );
  }
  if (!isDasAssetKind(kind)) {
    return Response.json(
      { error: 'kind must be stamp, seal, signature, initials, logo, or other' },
      { status: 400 }
    );
  }

  const expectedPrefix = `das/assets/${accountId}/`;
  if (!storageKey || !storageKey.startsWith(expectedPrefix)) {
    return Response.json(
      { error: 'storageKey must be issued for this account via upload-url' },
      { status: 400 }
    );
  }
  if (!publicUrl) {
    return Response.json({ error: 'publicUrl is required' }, { status: 400 });
  }
  const r2Public = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') ?? '';
  if (!r2Public) {
    return Response.json({ error: 'R2_PUBLIC_URL is not configured' }, { status: 503 });
  }
  const expectedPublic = `${r2Public}/${storageKey}`;
  if (publicUrl !== expectedPublic) {
    return Response.json(
      { error: 'publicUrl must match the URL issued by upload-url' },
      { status: 400 }
    );
  }

  const tags = Array.isArray(body.tags) ? body.tags : [];

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    INSERT INTO das_assets (
      account_id,
      owner_user_id,
      kind,
      label,
      file_name,
      mime_type,
      storage_key,
      public_url,
      signer_name,
      signer_title,
      tags
    )
    VALUES (
      ${accountId}::uuid,
      ${auth.userId}::uuid,
      ${kind},
      ${label},
      ${fileName},
      ${mimeType},
      ${storageKey},
      ${publicUrl},
      ${body.signerName?.trim() || null},
      ${body.signerTitle?.trim() || null},
      ${JSON.stringify(tags)}::jsonb
    )
    RETURNING
      id,
      account_id as "accountId",
      owner_user_id as "ownerUserId",
      kind,
      label,
      file_name as "fileName",
      mime_type as "mimeType",
      storage_key as "storageKey",
      public_url as "publicUrl",
      signer_name as "signerName",
      signer_title as "signerTitle",
      tags,
      created_at as "createdAt"
  `;

  const asset = serializeDasAsset(rows[0] as Parameters<typeof serializeDasAsset>[0]);

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'asset',
      ${asset.id}::uuid,
      'created',
      ${auth.userId}::uuid,
      ${JSON.stringify({ kind, label, fileName })}::jsonb
    )
  `;

  return Response.json({ asset }, { status: 201 });
}
