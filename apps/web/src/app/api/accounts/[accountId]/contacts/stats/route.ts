import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
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
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS "hasEmail",
      COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::int AS "hasPhone",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM marketing_workflow_enrollments mwe
          WHERE mwe.contact_id = contacts.id AND mwe.status = 'active'
        )
      )::int AS "inAutomation",
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS "newThisWeek"
    FROM contacts
    WHERE account_id = ${accountId}::uuid
  `;

  return Response.json({
    stats: rows[0] ?? { total: 0, hasEmail: 0, hasPhone: 0, inAutomation: 0, newThisWeek: 0 },
  });
}
