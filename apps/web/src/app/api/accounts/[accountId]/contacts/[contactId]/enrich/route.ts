import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import {
  enrichmentErrorResponse,
  type EnrichmentError,
} from '@/lib/credentials/providers/enrichment/errors';
import { runContactEnrichment } from '@/lib/companies/enrichment-run';
import type { EnrichmentScope } from '@/lib/credentials/providers/enrichment/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; contactId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    credentialId?: string;
    scope?: EnrichmentScope | 'auto';
  };

  if (!body.credentialId?.trim()) {
    return Response.json(
      { ok: false, error: 'Select an enrichment connection.', code: 'credential_not_found' },
      { status: 400 }
    );
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await runContactEnrichment(sql, {
    accountId,
    contactId,
    credentialId: body.credentialId.trim(),
    scope: body.scope ?? 'auto',
  });

  if (!('ok' in result) || result.ok !== true) {
    const err = result as EnrichmentError;
    if (err.detail) {
      console.error('[enrichment] contact enrich failed', {
        accountId,
        contactId,
        code: err.code,
        detail: err.detail,
      });
    }
    return Response.json(enrichmentErrorResponse(err), { status: err.status });
  }

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'contact.enriched',
    resourceType: 'contact',
    resourceId: contactId,
    metadata: {
      scope: result.scope,
      enrichmentStatus: result.enrichmentStatus,
      companyId: result.company?.id ?? null,
    },
  });

  return Response.json({
    ok: true,
    scope: result.scope,
    enrichmentStatus: result.enrichmentStatus,
    company: result.company,
    person: result.person,
  });
}
