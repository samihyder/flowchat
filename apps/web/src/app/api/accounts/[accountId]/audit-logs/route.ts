import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT a.id, a.action, a.resource_type as "resourceType", a.resource_id as "resourceId",
           a.metadata, a.created_at as "createdAt",
           u.name as "actorName", u.email as "actorEmail"
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.account_id = ${accountId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 100
  `;

  return Response.json({ logs: rows });
}
