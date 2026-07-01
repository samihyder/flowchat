import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { enrollContactInWorkflow, processWorkflowUntilIdle } from '@/lib/marketing/workflow-engine';

type Params = { params: Promise<{ accountId: string; automationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, automationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { contactId?: string };
  const contactId = body.contactId?.trim();
  if (!contactId) {
    return Response.json({ error: 'contactId is required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const wf = await sql`
    SELECT id FROM marketing_workflows
    WHERE id = ${automationId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!wf[0]) return Response.json({ error: 'Automation not found' }, { status: 404 });

  const contact = await sql`
    SELECT id FROM contacts
    WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!contact[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  const result = await enrollContactInWorkflow(sql, accountId, automationId, contactId);
  if (!result.enrolled) {
    return Response.json(
      { ok: false, enrolled: false, reason: result.reason ?? 'Could not enroll contact' },
      { status: 400 }
    );
  }

  await processWorkflowUntilIdle(sql, accountId, 25);

  return Response.json({ ok: true, enrolled: true });
}
