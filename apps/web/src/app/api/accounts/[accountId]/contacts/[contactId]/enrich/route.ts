import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import {
  enrichmentErrorResponse,
  type EnrichmentError,
} from '@/lib/credentials/providers/enrichment/errors';
import { runContactEnrichment } from '@/lib/companies/enrichment-run';
import { runEnrichmentFlowForContact } from '@/lib/enrichment-flow-runner';
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
    useFlow?: boolean;
    requestedFields?: string[];
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.useFlow !== false) {
    const flowResult = await runEnrichmentFlowForContact(
      sql,
      accountId,
      contactId,
      'manual',
      { requestedFields: body.requestedFields }
    );

    if (flowResult.ran) {
      await writeAuditLog(sql, {
        accountId,
        actorId: auth.userId,
        action: 'contact.enrichment_flow_ran',
        resourceType: 'contact',
        resourceId: contactId,
        metadata: {
          flowId: flowResult.flowId,
          suggestionCount: flowResult.suggestions?.length ?? 0,
          requestedFields: body.requestedFields ?? [],
        },
      });

      return Response.json({
        ok: true,
        flow: true,
        flowId: flowResult.flowId,
        suggestions: flowResult.suggestions ?? [],
      });
    }
  }

  if (!body.credentialId?.trim()) {
    return Response.json(
      {
        ok: false,
        error: 'No enrichment flow configured. Set up Settings → Enrichment flows first.',
        code: 'no_flow',
      },
      { status: 400 }
    );
  }

  const result = await runContactEnrichment(sql, {
    accountId,
    contactId,
    credentialId: body.credentialId.trim(),
    scope: body.scope ?? 'auto',
    allowedFieldKeys: body.requestedFields,
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
    action: 'contact.enrichment_fetched',
    resourceType: 'contact',
    resourceId: contactId,
    metadata: {
      suggestionId: result.suggestion.id,
      scope: result.scope,
      fieldCount: result.fieldCount,
      provider: result.suggestion.provider,
    },
  });

  return Response.json({
    ok: true,
    scope: result.scope,
    fieldCount: result.fieldCount,
    suggestion: result.suggestion,
  });
}
