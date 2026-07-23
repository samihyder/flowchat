import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

function serializeNotification(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    accountId: String(row.accountId),
    userId: String(row.userId),
    type: String(row.type),
    title: String(row.title),
    body: (row.body as string | null) ?? null,
    entityType: (row.entityType as string | null) ?? null,
    entityId: (row.entityId as string | null) ?? null,
    readAt: row.readAt ? new Date(row.readAt as string).toISOString() : null,
    createdAt: new Date(row.createdAt as string).toISOString(),
  };
}

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      n.id,
      n.account_id as "accountId",
      n.user_id as "userId",
      n.type,
      n.title,
      n.body,
      n.entity_type as "entityType",
      n.entity_id as "entityId",
      n.read_at as "readAt",
      n.created_at as "createdAt",
      count(*) OVER() as "totalCount"
    FROM das_notifications n
    WHERE n.account_id = ${accountId}::uuid
      AND n.user_id = ${auth.userId}::uuid
      AND (
        ${unreadOnly ? true : null}::boolean IS NULL
        OR n.read_at IS NULL
      )
    ORDER BY n.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const total = Number((rows[0] as { totalCount?: number } | undefined)?.totalCount ?? 0);
  const unreadRows = await sql`
    SELECT count(*)::int as count
    FROM das_notifications
    WHERE account_id = ${accountId}::uuid
      AND user_id = ${auth.userId}::uuid
      AND read_at IS NULL
  `;
  const unreadCount = Number((unreadRows[0] as { count?: number } | undefined)?.count ?? 0);

  const notifications = rows.map((r) => {
    const row = r as Record<string, unknown> & { totalCount?: number };
    const { totalCount: _, ...n } = row;
    return serializeNotification(n);
  });

  return Response.json({ notifications, total, unreadCount });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    ids?: string[];
    markAllRead?: boolean;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.markAllRead) {
    await sql`
      UPDATE das_notifications
      SET read_at = NOW()
      WHERE account_id = ${accountId}::uuid
        AND user_id = ${auth.userId}::uuid
        AND read_at IS NULL
    `;
    return Response.json({ ok: true });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return Response.json({ error: 'ids or markAllRead required' }, { status: 400 });
  }

  for (const id of ids) {
    await sql`
      UPDATE das_notifications
      SET read_at = NOW()
      WHERE id = ${id}::uuid
        AND account_id = ${accountId}::uuid
        AND user_id = ${auth.userId}::uuid
        AND read_at IS NULL
    `;
  }

  return Response.json({ ok: true });
}
