import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deleteAssistant, getAssistant, updateAssistant } from '@/lib/ai/assistants';

type Params = { params: Promise<{ accountId: string; assistantId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, assistantId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const assistant = await getAssistant(sql, accountId, assistantId);
  if (!assistant) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ assistant });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, assistantId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const assistant = await updateAssistant(sql, accountId, assistantId, {
    name: body.name as string | undefined,
    model: body.model as string | undefined,
    temperature: body.temperature as number | undefined,
    guidelines: body.guidelines as string | null | undefined,
    credentialId: body.credentialId as string | null | undefined,
    inboxId: body.inboxId as string | null | undefined,
    isEnabled: body.isEnabled as boolean | undefined,
  });
  if (!assistant) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ assistant });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, assistantId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteAssistant(sql, accountId, assistantId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
