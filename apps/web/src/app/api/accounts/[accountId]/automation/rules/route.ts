import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createAutomationRule, listAutomationRules } from '@/lib/automation/rules';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rules = await listAutomationRules(sql, accountId);
  return Response.json({ rules });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    description?: string | null;
    triggerEvent?: string;
    isEnabled?: boolean;
    sortOrder?: number;
    conditions?: { groupIndex: number; field: string; operator: string; value: unknown }[];
    actions?: { sortOrder: number; actionType: string; config: Record<string, unknown> }[];
  };
  if (!body.name?.trim() || !body.triggerEvent) {
    return Response.json({ error: 'name and triggerEvent required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rule = await createAutomationRule(sql, accountId, auth.userId, {
    name: body.name.trim(),
    description: body.description,
    triggerEvent: body.triggerEvent,
    isEnabled: body.isEnabled,
    sortOrder: body.sortOrder,
    conditions: body.conditions,
    actions: body.actions,
  });
  return Response.json({ rule }, { status: 201 });
}
