import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  provisionEnrichmentFieldMappings,
  type FieldMappingEntry,
} from '@/lib/enrichment-mapping-provision';

type Params = { params: Promise<{ accountId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    provider: string;
    credentialId?: string | null;
    fieldMappings?: Record<string, FieldMappingEntry>;
    enabled?: boolean;
    provisionAttributes?: boolean;
  };
  if (!body.provider?.trim()) {
    return Response.json({ error: 'provider required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const mappings = body.fieldMappings ?? {};

  await sql`
    INSERT INTO enrichment_provider_mappings (account_id, provider, credential_id, field_mappings, enabled)
    VALUES (
      ${accountId}::uuid,
      ${body.provider.trim()},
      ${body.credentialId ?? null}::uuid,
      ${JSON.stringify(mappings)}::jsonb,
      ${body.enabled ?? true}
    )
    ON CONFLICT (account_id, provider) DO UPDATE SET
      credential_id = COALESCE(EXCLUDED.credential_id, enrichment_provider_mappings.credential_id),
      field_mappings = EXCLUDED.field_mappings,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
  `;

  let attributes: { created: number } | null = null;
  if (body.provisionAttributes !== false && Object.keys(mappings).length > 0) {
    attributes = await provisionEnrichmentFieldMappings(sql, accountId, mappings);
  }

  return Response.json({ ok: true, attributes });
}
