import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { sendEmailReply } from '@/lib/channels/email-inbox';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { content?: string; subject?: string };
  if (!body.content?.trim()) {
    return Response.json({ error: 'content required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const result = await sendEmailReply(sql, accountId, conversationId, auth.userId, {
      content: body.content.trim(),
      subject: body.subject,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    const status = message.includes('not found') ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
