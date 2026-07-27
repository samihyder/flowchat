import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deletePushToken, listPushTokens, registerPushToken } from '@/lib/mobile/push-tokens';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ tokens: await listPushTokens(sql, accountId, auth.userId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await req.json()) as { platform?: string; token?: string };
  if (!body.platform || !body.token?.trim()) {
    return Response.json({ error: 'platform and token required' }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const device = await registerPushToken(sql, accountId, auth.userId, {
    platform: body.platform, token: body.token.trim(),
  });
  return Response.json({ token: device }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const deviceToken = url.searchParams.get('token');
  if (!deviceToken) return Response.json({ error: 'token query required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deletePushToken(sql, accountId, auth.userId, deviceToken);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
