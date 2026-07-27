import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createMacro, listMacros } from '@/lib/automation/macros';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const macros = await listMacros(sql, accountId, auth.userId);
  return Response.json({ macros });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    visibility?: string;
    actions?: { actionType: string; config: Record<string, unknown> }[];
  };
  if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const macro = await createMacro(sql, accountId, {
    name: body.name.trim(),
    visibility: body.visibility,
    ownerUserId: body.visibility === 'personal' ? auth.userId : null,
    actions: body.actions,
  });
  return Response.json({ macro }, { status: 201 });
}
