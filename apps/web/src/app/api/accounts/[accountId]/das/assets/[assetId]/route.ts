import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; assetId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, assetId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM das_assets
    WHERE id = ${assetId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Asset not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'asset',
      ${assetId}::uuid,
      'deleted',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ ok: true });
}
