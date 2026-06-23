import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { verifyEmailCredential } from '@/lib/credentials/providers/email';
import { verifyAnthropicKey } from '@/lib/credentials/providers/ai/anthropic';
import { verifyEnrichmentCredential } from '@/lib/credentials/providers/enrichment';
import {
  deleteCredential,
  getCredentialSecret,
  updateCredential,
  updateCredentialSecret,
} from '@/lib/credentials/store';
import type { EmailProviderId, EnrichmentProviderId } from '@/lib/credentials/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; credentialId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, credentialId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    label?: string;
    isDefault?: boolean;
    config?: Record<string, unknown>;
    secret?: string;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await getCredentialSecret(sql, accountId, credentialId, { activeOnly: false });
  if (!existing) return Response.json({ error: 'Credential not found' }, { status: 404 });

  if (body.secret?.trim()) {
    let verify: { ok: true } | { ok: false; error: string };
    const mergedConfig = { ...existing.row.config, ...(body.config ?? {}) };
    if (existing.row.category === 'email_marketing') {
      verify = await verifyEmailCredential(
        existing.row.provider as EmailProviderId,
        body.secret.trim(),
        mergedConfig
      );
    } else if (existing.row.provider === 'anthropic') {
      verify = await verifyAnthropicKey(body.secret.trim());
    } else if (existing.row.category === 'data_enrichment') {
      verify = await verifyEnrichmentCredential(
        existing.row.provider as EnrichmentProviderId,
        body.secret.trim(),
        mergedConfig
      );
    } else {
      return Response.json({ error: 'Unsupported provider' }, { status: 400 });
    }
    if (!verify.ok) return Response.json({ error: verify.error }, { status: 400 });
    await updateCredentialSecret(sql, accountId, credentialId, body.secret.trim());
  }

  const { secret: _secret, ...patch } = body;
  if (patch.label || patch.isDefault !== undefined || patch.config) {
    await updateCredential(sql, accountId, credentialId, patch);
  }

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'service_credential.updated',
    resourceType: 'service_credential',
    resourceId: credentialId,
    metadata: { ...patch, secretRotated: Boolean(body.secret?.trim()) },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, credentialId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  await deleteCredential(sql, accountId, credentialId);

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'service_credential.deleted',
    resourceType: 'service_credential',
    resourceId: credentialId,
  });

  return Response.json({ ok: true });
}
