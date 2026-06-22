import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  restartAutomationEnrollments,
} from '@/lib/marketing/workflow-engine';
import {
  processWorkflowUntilIdle,
  reviveStaleCompletedEnrollments,
} from '@/lib/marketing/workflow-engine';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; automationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, automationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const wf = await sql`
    SELECT id FROM marketing_workflows
    WHERE id = ${automationId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!wf[0]) return Response.json({ error: 'Automation not found' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { contactIds?: string[] };
  await restartAutomationEnrollments(sql, automationId, body.contactIds);
  await reviveStaleCompletedEnrollments(sql, automationId);
  const result = await processWorkflowUntilIdle(sql, accountId, 50);

  return Response.json({ ok: true, ...result });
}
