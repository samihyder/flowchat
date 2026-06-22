import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { verifyEmailCredential } from '@/lib/credentials/providers/email';
import { verifyAnthropicKey } from '@/lib/credentials/providers/ai/anthropic';
import {
  getCredentialSecret,
  setCredentialStatus,
} from '@/lib/credentials/store';
import type { EmailProviderId } from '@/lib/credentials/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; credentialId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, credentialId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const cred = await getCredentialSecret(sql, accountId, credentialId);
  if (!cred) return Response.json({ error: 'Credential not found' }, { status: 404 });

  let verify: { ok: true } | { ok: false; error: string };
  if (cred.row.category === 'email_marketing') {
    verify = await verifyEmailCredential(
      cred.row.provider as EmailProviderId,
      cred.secret,
      cred.row.config
    );
  } else if (cred.row.provider === 'anthropic') {
    verify = await verifyAnthropicKey(cred.secret);
  } else {
    return Response.json({ error: 'Unsupported provider' }, { status: 400 });
  }

  if (!verify.ok) {
    await setCredentialStatus(sql, accountId, credentialId, 'invalid');
    return Response.json({ ok: false, error: verify.error }, { status: 400 });
  }

  await sql`
    UPDATE account_service_credentials
    SET status = 'active', last_verified_at = NOW(), updated_at = NOW()
    WHERE id = ${credentialId}::uuid
  `;

  return Response.json({ ok: true });
}
