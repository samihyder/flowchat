import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { appendCopilotMessage, getOrCreateCopilotThread } from '@/lib/ai/assistants';
import { suggestReplies, summarizeConversation } from '@/lib/ai/copilot';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const thread = await getOrCreateCopilotThread(sql, accountId, conversationId, auth.userId);
  return Response.json({ thread });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    content?: string;
    role?: string;
    action?: 'suggest' | 'summarize' | 'ask';
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.action === 'suggest') {
    const result = await suggestReplies(sql, accountId, conversationId);
    return Response.json(result);
  }
  if (body.action === 'summarize') {
    const result = await summarizeConversation(sql, accountId, conversationId);
    return Response.json(result);
  }

  if (!body.content?.trim()) {
    return Response.json({ error: 'content required' }, { status: 400 });
  }

  const thread = await appendCopilotMessage(sql, accountId, conversationId, auth.userId, {
    role: body.role ?? 'user',
    content: body.content.trim(),
  });
  return Response.json({ thread });
}
