import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; flowId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, flowId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    enabled?: boolean;
    triggerOn?: string;
    steps?: { stepType: string; config: Record<string, unknown> }[];
  };

  const sql = neon(process.env.DATABASE_URL!);
  if (body.name !== undefined || body.enabled !== undefined || body.triggerOn !== undefined) {
    await sql`
      UPDATE enrichment_flows SET
        name = COALESCE(${body.name ?? null}, name),
        enabled = COALESCE(${body.enabled ?? null}, enabled),
        trigger_on = COALESCE(${body.triggerOn ?? null}, trigger_on),
        updated_at = NOW()
      WHERE id = ${flowId}::uuid AND account_id = ${accountId}::uuid
    `;
  }

  if (body.steps) {
    await sql`DELETE FROM enrichment_flow_steps WHERE flow_id = ${flowId}::uuid`;
    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      if (!step) continue;
      await sql`
        INSERT INTO enrichment_flow_steps (flow_id, step_order, step_type, config)
        VALUES (
          ${flowId}::uuid,
          ${i},
          ${step.stepType},
          ${JSON.stringify(step.config ?? {})}::jsonb
        )
      `;
    }
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, flowId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    DELETE FROM enrichment_flows
    WHERE id = ${flowId}::uuid AND account_id = ${accountId}::uuid
  `;
  return Response.json({ ok: true });
}
