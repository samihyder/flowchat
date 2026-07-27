import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { getChannelConfig, upsertChannelConfig } from '@/lib/channels/channel-configs';

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
  const config = await getChannelConfig(sql, accountId, inboxId);
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
  const body = (await req.json()) as {
    channelType?: string;
    config?: Record<string, unknown>;
    secretsEncrypted?: string | null;
    healthStatus?: string;
    tokenExpiresAt?: string | null;
  };
  if (!body.channelType) return Response.json({ error: 'channelType required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const config = await upsertChannelConfig(sql, accountId, inboxId, {
      channelType: body.channelType,
      config: body.config,
      secretsEncrypted: body.secretsEncrypted,
      healthStatus: body.healthStatus,
      tokenExpiresAt: body.tokenExpiresAt,
    });
    const { signingSecret, ...safeConfig } = config;
    return Response.json({
      config: safeConfig,
      ...(signingSecret ? { signingSecret } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return Response.json({ error: message }, { status: message === 'Inbox not found' ? 404 : 400 });
  }
}
