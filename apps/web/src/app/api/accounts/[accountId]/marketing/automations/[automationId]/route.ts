import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import {
  getAutomationEditPayload,
  getAutomationStats,
  updateEmailAutomation,
  type CreateAutomationInput,
} from '@/lib/marketing/automation-builder';

type Params = { params: Promise<{ accountId: string; automationId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, automationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const url = new URL(req.url);
  if (url.searchParams.get('edit') === '1') {
    const edit = await getAutomationEditPayload(sql, accountId, automationId);
    if (!edit) return Response.json({ error: 'Automation not found' }, { status: 404 });
    return Response.json({ edit });
  }

  const stats = await getAutomationStats(sql, accountId, automationId);
  if (!stats) return Response.json({ error: 'Automation not found' }, { status: 404 });

  return Response.json(stats);
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, automationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as CreateAutomationInput & { enabled?: boolean };
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.name && body.emails && body.contactIds) {
    try {
      const result = await updateEmailAutomation(sql, accountId, automationId, body);
      if (typeof body.enabled === 'boolean') {
        await sql`
          UPDATE marketing_workflows SET enabled = ${body.enabled}, updated_at = NOW()
          WHERE id = ${automationId}::uuid AND account_id = ${accountId}::uuid
        `;
      }
      return Response.json({ ok: true, ...result });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Failed to update automation' },
        { status: 400 }
      );
    }
  }

  if (typeof body.enabled === 'boolean') {
    await sql`
      UPDATE marketing_workflows SET enabled = ${body.enabled}, updated_at = NOW()
      WHERE id = ${automationId}::uuid AND account_id = ${accountId}::uuid
    `;
  }

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, automationId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM marketing_workflows
    WHERE id = ${automationId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!rows.length) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
