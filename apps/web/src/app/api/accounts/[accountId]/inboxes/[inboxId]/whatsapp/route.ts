import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { getWhatsAppInboxConfig, upsertWhatsAppInboxConfig } from '@/lib/channels/whatsapp-cloud';

type Params = { params: Promise<{ accountId: string; inboxId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const config = await getWhatsAppInboxConfig(sql, accountId, inboxId);
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
    const config = await upsertWhatsAppInboxConfig(sql, accountId, inboxId, {
      wabaId: body.wabaId as string | null | undefined,
      phoneNumberId: body.phoneNumberId as string | null | undefined,
      displayPhone: body.displayPhone as string | null | undefined,
      accessToken: (body.accessToken ?? body.accessTokenEncrypted) as string | null | undefined,
      verifyToken: body.verifyToken as string | null | undefined,
      appSecret: (body.appSecret ?? body.appSecretEncrypted) as string | null | undefined,
      webhookSubscribed: body.webhookSubscribed as boolean | undefined,
    });
    return Response.json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return Response.json({ error: message }, { status: message === 'Inbox not found' ? 404 : 400 });
  }
}
