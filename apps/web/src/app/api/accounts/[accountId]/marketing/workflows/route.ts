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
    SELECT w.id, w.name, w.trigger_type as "triggerType", w.trigger_config as "triggerConfig",
           w.sender_id as "senderId", w.enabled, w.allow_reentry as "allowReentry",
           w.created_at as "createdAt", w.updated_at as "updatedAt",
           (SELECT COUNT(*)::int FROM marketing_workflow_enrollments e
            WHERE e.workflow_id = w.id AND e.status = 'active') as "activeEnrollments"
    FROM marketing_workflows w
    WHERE w.account_id = ${accountId}::uuid
    ORDER BY w.updated_at DESC
  `;

  const workflows = await Promise.all(
    (rows as Record<string, unknown>[]).map(async (w) => {
      const steps = await sql`
        SELECT id, step_order as "stepOrder", step_type as "stepType", config
        FROM marketing_workflow_steps WHERE workflow_id = ${w.id as string}::uuid
        ORDER BY step_order ASC
      `;
      return {
        ...w,
        createdAt: new Date(w.createdAt as Date).toISOString(),
        updatedAt: new Date(w.updatedAt as Date).toISOString(),
        steps,
      };
    })
  );

  return Response.json({ workflows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    senderId?: string;
    allowReentry?: boolean;
    steps?: { stepType: string; config: Record<string, unknown> }[];
  };
  if (!body.name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    INSERT INTO marketing_workflows (
      account_id, name, trigger_type, trigger_config, sender_id, allow_reentry
    ) VALUES (
      ${accountId}::uuid,
      ${body.name.trim()},
      ${body.triggerType ?? 'manual'},
      ${JSON.stringify(body.triggerConfig ?? {})}::jsonb,
      ${body.senderId ?? null}::uuid,
      ${body.allowReentry ?? false}
    )
    RETURNING id
  `;
  const workflowId = (rows[0] as { id: string }).id;

  const steps = body.steps ?? [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;
    await sql`
      INSERT INTO marketing_workflow_steps (workflow_id, step_order, step_type, config)
      VALUES (${workflowId}::uuid, ${i + 1}, ${step.stepType}, ${JSON.stringify(step.config)}::jsonb)
    `;
  }

  return Response.json({ workflowId }, { status: 201 });
}
