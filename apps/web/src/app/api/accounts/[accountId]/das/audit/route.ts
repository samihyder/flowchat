import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDasAuditLog } from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator' && !auth.isSuperAdmin) {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      a.id,
      a.account_id as "accountId",
      a.entity_type as "entityType",
      a.entity_id as "entityId",
      a.action,
      a.actor_id as "actorId",
      u.name as "actorName",
      a.metadata,
      a.created_at as "createdAt",
      count(*) OVER() as "totalCount"
    FROM das_audit_logs a
    LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.account_id = ${accountId}::uuid
    ORDER BY a.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const total = Number((rows[0] as { totalCount?: number } | undefined)?.totalCount ?? 0);
  const logs = rows.map((r) => {
    const row = r as Record<string, unknown> & { totalCount?: number };
    const { totalCount: _, ...log } = row;
    return serializeDasAuditLog(log as Parameters<typeof serializeDasAuditLog>[0]);
  });

  return Response.json({ logs, total });
}
