import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { getEmailInboxConfig, upsertEmailInboxConfig } from '@/lib/channels/email-inbox';

type Params = { params: Promise<{ accountId: string; inboxId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const config = await getEmailInboxConfig(sql, accountId, inboxId);
  if (!config) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ config });
}

export async function PUT(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const config = await upsertEmailInboxConfig(sql, accountId, inboxId, {
      forwardingAddress: body.forwardingAddress as string | null | undefined,
      imapHost: body.imapHost as string | null | undefined,
      imapPort: body.imapPort as number | null | undefined,
      imapUser: body.imapUser as string | null | undefined,
      imapPasswordEncrypted: body.imapPasswordEncrypted as string | null | undefined,
      imapTls: body.imapTls as boolean | undefined,
      smtpHost: body.smtpHost as string | null | undefined,
      smtpPort: body.smtpPort as number | null | undefined,
      smtpUser: body.smtpUser as string | null | undefined,
      smtpPasswordEncrypted: body.smtpPasswordEncrypted as string | null | undefined,
      smtpFromEmail: body.smtpFromEmail as string | null | undefined,
      smtpFromName: body.smtpFromName as string | null | undefined,
      useResendOutbound: body.useResendOutbound as boolean | undefined,
      credentialId: body.credentialId as string | null | undefined,
    });
    return Response.json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    const status = message === 'Inbox not found' ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
