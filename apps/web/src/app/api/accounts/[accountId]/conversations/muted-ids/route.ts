import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

/**
 * Bootstraps the client-side muted-conversation set independent of whatever
 * conversation list is currently loaded — used by useMutedConversations,
 * which useMessageAlert consults before playing a sound for a new message.
 */
export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  const sql = neon(databaseUrl);

  const rows = (await sql`
    SELECT conversation_id as "conversationId"
    FROM conversation_mutes
    WHERE user_id = ${auth.userId}::uuid AND account_id = ${accountId}::uuid
  `) as { conversationId: string }[];

  return Response.json({ mutedConversationIds: rows.map((r) => r.conversationId) });
}
