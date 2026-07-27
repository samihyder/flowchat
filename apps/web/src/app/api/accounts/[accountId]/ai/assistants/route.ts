import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createAssistant, listAssistants } from '@/lib/ai/assistants';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const assistants = await listAssistants(sql, accountId);
  return Response.json({ assistants });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    model?: string;
    temperature?: number;
    guidelines?: string | null;
    credentialId?: string | null;
    inboxId?: string | null;
    isEnabled?: boolean;
  };
  if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const assistant = await createAssistant(sql, accountId, {
    name: body.name.trim(),
    model: body.model,
    temperature: body.temperature,
    guidelines: body.guidelines,
    credentialId: body.credentialId,
    inboxId: body.inboxId,
    isEnabled: body.isEnabled,
  });
  return Response.json({ assistant }, { status: 201 });
}
