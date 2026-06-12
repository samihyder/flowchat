import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { enrollContactInWorkflow } from '@/lib/marketing/workflow-engine';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; workflowId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, workflowId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { contactId?: string };
  if (!body.contactId) return Response.json({ error: 'contactId is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await enrollContactInWorkflow(sql, accountId, workflowId, body.contactId);
  if (!result.enrolled) {
    return Response.json({ error: result.reason ?? 'Enrollment failed' }, { status: 400 });
  }
  return Response.json({ ok: true });
}
