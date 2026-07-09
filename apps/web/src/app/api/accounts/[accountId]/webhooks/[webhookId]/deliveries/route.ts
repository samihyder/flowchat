import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; webhookId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, webhookId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await authorizeAccount(token, accountId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const owned = await sql`
    SELECT 1 FROM account_webhooks WHERE id = ${webhookId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!owned[0]) return Response.json({ error: 'Webhook not found' }, { status: 404 });

  const rows = await sql`
    SELECT id, event, status, attempts, last_error as "lastError",
           created_at as "createdAt", delivered_at as "deliveredAt"
    FROM webhook_deliveries
    WHERE webhook_id = ${webhookId}::uuid
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return Response.json({ deliveries: rows });
}
