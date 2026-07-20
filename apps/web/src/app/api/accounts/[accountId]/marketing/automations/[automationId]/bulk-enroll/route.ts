import { neon } from '@/lib/neon';
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

  const body = (await req.json()) as { contactIds?: string[] };
  const contactIds = (body.contactIds ?? []).filter(Boolean);
  if (contactIds.length === 0) {
    return Response.json({ error: 'contactIds is required' }, { status: 400 });
  }
  // Enrollment + workflow processing runs sequentially per contact within this request;
  // cap batch size so a large selection can't blow the request timeout.
  const MAX_BULK_ENROLL = 200;
  if (contactIds.length > MAX_BULK_ENROLL) {
    return Response.json(
      { error: `Cannot bulk-enroll more than ${MAX_BULK_ENROLL} contacts at once (got ${contactIds.length})` },
      { status: 400 }
    );
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const wf = await sql`
    SELECT id FROM marketing_workflows
    WHERE id = ${automationId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!wf[0]) return Response.json({ error: 'Automation not found' }, { status: 404 });

  const validContacts = await sql`
    SELECT id FROM contacts WHERE account_id = ${accountId}::uuid AND id = ANY(${contactIds}::uuid[])
  `;
  const validIds = new Set((validContacts as { id: string }[]).map((c) => c.id));

  const results: { contactId: string; enrolled: boolean; reason?: string }[] = [];
  for (const contactId of contactIds) {
    if (!validIds.has(contactId)) {
      results.push({ contactId, enrolled: false, reason: 'Contact not found' });
      continue;
    }
    const result = await enrollContactInWorkflow(sql, accountId, automationId, contactId);
    results.push({ contactId, enrolled: result.enrolled, reason: result.reason });
  }

  await processWorkflowUntilIdle(sql, accountId, 50);

  const enrolledCount = results.filter((r) => r.enrolled).length;
  return Response.json({ ok: true, enrolledCount, results });
}
