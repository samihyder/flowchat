import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const flows = await sql`
    SELECT f.id, f.name, f.enabled, f.trigger_on, f.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'stepOrder', s.step_order,
            'stepType', s.step_type,
            'config', s.config
          ) ORDER BY s.step_order
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) as steps
    FROM enrichment_flows f
    LEFT JOIN enrichment_flow_steps s ON s.flow_id = f.id
    WHERE f.account_id = ${accountId}::uuid
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `;

  const mappings = await sql`
    SELECT id, provider, credential_id, field_mappings, enabled
    FROM enrichment_provider_mappings
    WHERE account_id = ${accountId}::uuid
    ORDER BY provider ASC
  `;

  return Response.json({ flows, mappings });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    triggerOn?: string;
    steps?: { stepType: string; config: Record<string, unknown> }[];
  };
  if (!body.name?.trim()) {
    return Response.json({ error: 'name required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    INSERT INTO enrichment_flows (account_id, name, trigger_on)
    VALUES (${accountId}::uuid, ${body.name.trim()}, ${body.triggerOn ?? 'contact_created'})
    RETURNING id, name, enabled, trigger_on
  `;
  const flow = rows[0] as { id: string };

  const steps = body.steps ?? [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await sql`
      INSERT INTO enrichment_flow_steps (flow_id, step_order, step_type, config)
      VALUES (
        ${flow.id}::uuid,
        ${i},
        ${step.stepType},
        ${JSON.stringify(step.config ?? {})}::jsonb
      )
    `;
  }

  return Response.json({ flow });
}
