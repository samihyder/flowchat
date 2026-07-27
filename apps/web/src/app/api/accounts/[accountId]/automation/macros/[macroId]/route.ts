import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deleteMacro, getMacro, updateMacro } from '@/lib/automation/macros';

type Params = { params: Promise<{ accountId: string; macroId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, macroId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const macro = await getMacro(sql, accountId, macroId);
  if (!macro) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ macro });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, macroId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const macro = await updateMacro(sql, accountId, macroId, {
    name: body.name as string | undefined,
    visibility: body.visibility as string | undefined,
    actions: body.actions as never,
  });
  if (!macro) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ macro });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, macroId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteMacro(sql, accountId, macroId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
