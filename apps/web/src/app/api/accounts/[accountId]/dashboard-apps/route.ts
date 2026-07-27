import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import {
  createDashboardApp, deleteDashboardApp, listDashboardApps, updateDashboardApp,
} from '@/lib/enterprise/dashboard-apps';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ apps: await listDashboardApps(sql, accountId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; embedUrl?: string; isEnabled?: boolean; id?: string };
  if (body.id) {
    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const app = await updateDashboardApp(sql, accountId, body.id, {
      name: body.name, embedUrl: body.embedUrl, isEnabled: body.isEnabled,
    });
    if (!app) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ app });
  }
  if (!body.name?.trim() || !body.embedUrl?.trim()) {
    return Response.json({ error: 'name and embedUrl required' }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const app = await createDashboardApp(sql, accountId, {
    name: body.name.trim(), embedUrl: body.embedUrl.trim(), isEnabled: body.isEnabled,
  });
  return Response.json({ app }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const url = new URL(req.url);
  const appId = url.searchParams.get('id');
  if (!appId) return Response.json({ error: 'id required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteDashboardApp(sql, accountId, appId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
