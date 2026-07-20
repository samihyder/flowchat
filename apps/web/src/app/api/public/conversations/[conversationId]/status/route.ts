import { neon } from '@/lib/neon';
import { corsHeaders, optionsResponse } from '@/lib/cors';

type Params = { params: Promise<{ conversationId: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request, { params }: Params) {
  const { conversationId } = await params;
  const visitorToken = req.headers.get('X-Visitor-Token');
  if (!visitorToken) {
    return Response.json({ error: 'Missing visitor token' }, { status: 401, headers: corsHeaders() });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503, headers: corsHeaders() });
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT c.status, i.csat_enabled as "csatEnabled",
           EXISTS (SELECT 1 FROM csat_responses WHERE conversation_id = c.id) as "csatSubmitted"
    FROM conversations c
    INNER JOIN contact_inboxes ci ON ci.contact_id = c.contact_id AND ci.inbox_id = c.inbox_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    WHERE c.id = ${conversationId}::uuid AND ci.visitor_token = ${visitorToken}
    LIMIT 1
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  return Response.json({ status: rows[0] }, { headers: corsHeaders() });
}
