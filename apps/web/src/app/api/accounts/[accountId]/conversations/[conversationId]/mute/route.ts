import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

/** Mute/unmute one conversation for the current agent only — a personal notification preference, not admin-gated. */
export async function POST(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { muted?: boolean };
  const muted = body.muted !== false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  const sql = neon(databaseUrl);

  const convRows = await sql`
    SELECT id FROM conversations WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!convRows[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  if (muted) {
    await sql`
      INSERT INTO conversation_mutes (conversation_id, user_id, account_id)
      VALUES (${conversationId}::uuid, ${auth.userId}::uuid, ${accountId}::uuid)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `;
  } else {
    await sql`
      DELETE FROM conversation_mutes
      WHERE conversation_id = ${conversationId}::uuid AND user_id = ${auth.userId}::uuid
    `;
  }

  return Response.json({ muted });
}
