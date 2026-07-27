import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import {
  deleteAutomationRule,
  getAutomationRule,
  updateAutomationRule,
} from '@/lib/automation/rules';

type Params = { params: Promise<{ accountId: string; ruleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, ruleId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rule = await getAutomationRule(sql, accountId, ruleId);
  if (!rule) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ rule });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, ruleId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rule = await updateAutomationRule(sql, accountId, ruleId, {
    name: body.name as string | undefined,
    description: body.description as string | null | undefined,
    triggerEvent: body.triggerEvent as string | undefined,
    isEnabled: body.isEnabled as boolean | undefined,
    sortOrder: body.sortOrder as number | undefined,
    conditions: body.conditions as never,
    actions: body.actions as never,
  });
  if (!rule) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ rule });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, ruleId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteAutomationRule(sql, accountId, ruleId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
