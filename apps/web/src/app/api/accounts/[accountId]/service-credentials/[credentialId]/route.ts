import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import {
  deleteCredential,
  getCredentialSecret,
  updateCredential,
} from '@/lib/credentials/store';
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
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await getCredentialSecret(sql, accountId, credentialId);
  if (!existing) return Response.json({ error: 'Credential not found' }, { status: 404 });

  await updateCredential(sql, accountId, credentialId, body);

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'service_credential.updated',
    resourceType: 'service_credential',
    resourceId: credentialId,
    metadata: body,
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
