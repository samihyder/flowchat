import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; workflowId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, workflowId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    enabled?: boolean;
    name?: string;
    allowReentry?: boolean;
    maxEnrollments?: number | null;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    UPDATE marketing_workflows SET
      enabled = COALESCE(${body.enabled ?? null}, enabled),
      name = COALESCE(${body.name?.trim() ?? null}, name),
      allow_reentry = COALESCE(${body.allowReentry ?? null}, allow_reentry),
      max_enrollments = COALESCE(${body.maxEnrollments ?? null}, max_enrollments),
      updated_at = NOW()
    WHERE id = ${workflowId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, enabled, allow_reentry as "allowReentry", max_enrollments as "maxEnrollments"
  `;
  if (!rows[0]) return Response.json({ error: 'Workflow not found' }, { status: 404 });
  return Response.json({ workflow: rows[0] });
}
