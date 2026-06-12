import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';

type Params = { params: Promise<{ conversationId: string }> };

async function resolveVisitor(conversationId: string, visitorToken: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT c.id, c.account_id as "accountId", c.inbox_id as "inboxId", i.csat_enabled as "csatEnabled"
    FROM conversations c
    INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    WHERE c.id = ${conversationId}::uuid AND ci.visitor_token = ${visitorToken}
    LIMIT 1
  `;
  return rows[0] as {
    id: string;
    accountId: string;
    inboxId: string;
    csatEnabled: boolean;
  } | undefined;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request, { params }: Params) {
  const { conversationId } = await params;
  const visitorToken = req.headers.get('X-Visitor-Token');
  if (!visitorToken) {
    return Response.json({ error: 'Missing visitor token' }, { status: 401, headers: corsHeaders() });
  }

  const ctx = await resolveVisitor(conversationId, visitorToken);
  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }
  if (!ctx.csatEnabled) {
    return Response.json({ error: 'CSAT not enabled' }, { status: 400, headers: corsHeaders() });
  }

  const body = (await req.json()) as { score?: number; comment?: string };
  const score = body.score;
  if (!score || score < 1 || score > 5) {
    return Response.json({ error: 'Score must be 1–5' }, { status: 400, headers: corsHeaders() });
  }

  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`
      INSERT INTO csat_responses (conversation_id, inbox_id, account_id, score, comment)
      VALUES (
        ${conversationId}::uuid,
        ${ctx.inboxId}::uuid,
        ${ctx.accountId}::uuid,
        ${score},
        ${body.comment?.trim() || null}
      )
    `;
  } catch {
    return Response.json({ error: 'Already submitted' }, { status: 409, headers: corsHeaders() });
  }

  return Response.json({ ok: true }, { headers: corsHeaders() });
}
