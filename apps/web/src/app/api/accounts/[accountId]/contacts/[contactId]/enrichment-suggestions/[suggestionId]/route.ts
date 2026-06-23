import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { applySuggestionFields, dismissSuggestion } from '@/lib/companies/enrichment-suggestions';
import type { AppSql } from '@/lib/db-sql';

type Params = {
  params: Promise<{ accountId: string; contactId: string; suggestionId: string }>;
};

export async function POST(req: Request, { params }: Params) {
  const { accountId, contactId, suggestionId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { fieldKeys?: string[] };
  if (!body.fieldKeys?.length) {
    return Response.json({ error: 'Select at least one field to apply' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const result = await applySuggestionFields(sql, {
      accountId,
      contactId,
      suggestionId,
      fieldKeys: body.fieldKeys,
      appliedBy: auth.userId,
    });

    await writeAuditLog(sql, {
      accountId,
      actorId: auth.userId,
      action: 'contact.enrichment_applied',
      resourceType: 'contact',
      resourceId: contactId,
      metadata: {
        suggestionId,
        appliedCount: result.appliedCount,
        fieldKeys: body.fieldKeys,
      },
    });

    return Response.json({
      ok: true,
      appliedCount: result.appliedCount,
      company: result.company,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply suggestions';
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, contactId, suggestionId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await dismissSuggestion(sql, accountId, contactId, suggestionId);
  if (!ok) return Response.json({ error: 'Suggestion not found' }, { status: 404 });
  return Response.json({ ok: true });
}
