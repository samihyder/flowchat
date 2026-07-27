import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { runMacro } from '@/lib/automation/macros';

type Params = { params: Promise<{ accountId: string; macroId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, macroId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { conversationId?: string };
  if (!body.conversationId) {
    return Response.json({ error: 'conversationId required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await runMacro(sql, accountId, body.conversationId, macroId, auth.userId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 404 });
  }
  return Response.json(result);
}
