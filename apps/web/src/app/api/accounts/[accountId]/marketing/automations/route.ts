import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import {
  createEmailAutomation,
  getAutomationStats,
  type CreateAutomationInput,
} from '@/lib/marketing/automation-builder';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT w.id, w.name, w.enabled, w.created_at as "createdAt",
           (SELECT COUNT(*)::int FROM marketing_workflow_enrollments e WHERE e.workflow_id = w.id) as "contactCount",
           (SELECT COUNT(*)::int FROM marketing_workflow_steps s
            WHERE s.workflow_id = w.id AND s.step_type = 'send_email') as "emailCount",
           (SELECT COUNT(*)::int FROM contact_email_events ev
            WHERE ev.event_type = 'workflow_sent'
              AND ev.metadata->>'workflowId' = w.id::text
              AND ev.metadata->>'messageId' IS NOT NULL) as "emailsSent"
    FROM marketing_workflows w
    WHERE w.account_id = ${accountId}::uuid
      AND w.trigger_type = 'manual'
    ORDER BY w.created_at DESC
  `;

  return Response.json({
    automations: (rows as { createdAt: Date }[]).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as CreateAutomationInput;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  try {
    const result = await createEmailAutomation(sql, accountId, body);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to create automation' },
      { status: 400 }
    );
  }
}
