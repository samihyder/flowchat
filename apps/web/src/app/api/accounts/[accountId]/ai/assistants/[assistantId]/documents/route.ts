import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createDocument, listDocuments } from '@/lib/ai/assistants';

type Params = { params: Promise<{ accountId: string; assistantId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, assistantId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const documents = await listDocuments(sql, accountId, assistantId);
  return Response.json({ documents });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, assistantId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    sourceType?: string;
    sourceUrl?: string | null;
  };
  if (!body.title?.trim() || !body.sourceType) {
    return Response.json({ error: 'title and sourceType required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const document = await createDocument(sql, accountId, {
    assistantId,
    title: body.title.trim(),
    sourceType: body.sourceType,
    sourceUrl: body.sourceUrl,
  });
  return Response.json({ document }, { status: 201 });
}
