import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { rewriteText, suggestReplies, summarizeConversation } from '@/lib/ai/copilot';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    conversationId?: string;
    mode?: 'suggest' | 'summarize' | 'rewrite';
    text?: string;
    tone?: string;
  };
  const mode = body.mode ?? 'suggest';
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (mode === 'rewrite') {
    if (!body.text?.trim()) return Response.json({ error: 'text required' }, { status: 400 });
    const result = await rewriteText(sql, accountId, body.text, body.tone);
    return Response.json(result);
  }

  if (!body.conversationId) {
    return Response.json({ error: 'conversationId required' }, { status: 400 });
  }

  if (mode === 'summarize') {
    const result = await summarizeConversation(sql, accountId, body.conversationId);
    return Response.json(result);
  }

  const result = await suggestReplies(sql, accountId, body.conversationId);
  return Response.json(result);
}
