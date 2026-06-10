import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { newVisitorToken } from '@/lib/conversations';

type Params = { params: Promise<{ inboxId: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503, headers: corsHeaders() });
  }

  const body = (await req.json()) as { sourceId?: string; name?: string; email?: string };
  const sourceId = body.sourceId?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim() || null;

  if (!sourceId || sourceId.length < 8) {
    return Response.json({ error: 'Invalid sourceId' }, { status: 400, headers: corsHeaders() });
  }
  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders() });
  }

  const sql = neon(databaseUrl);
  const inboxes = await sql`
    SELECT id, account_id as "accountId" FROM inboxes
    WHERE id = ${inboxId}::uuid AND is_enabled = true LIMIT 1
  `;
  const inbox = inboxes[0] as { id: string; accountId: string } | undefined;
  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
  }

  const existing = await sql`
    SELECT ci.visitor_token as "visitorToken", c.id as "contactId", c.name, c.email
    FROM contact_inboxes ci
    INNER JOIN contacts c ON c.id = ci.contact_id
    WHERE ci.inbox_id = ${inboxId}::uuid AND ci.source_id = ${sourceId}
    LIMIT 1
  `;

  if (existing[0]) {
    const link = existing[0] as {
      visitorToken: string;
      contactId: string;
      name: string;
      email: string | null;
    };

    if (name !== link.name || (email && email !== link.email)) {
      await sql`
        UPDATE contacts SET name = ${name}, email = COALESCE(${email}, email), updated_at = NOW()
        WHERE id = ${link.contactId}::uuid
      `;
    }

    let convRows = await sql`
      SELECT id FROM conversations
      WHERE contact_id = ${link.contactId}::uuid
        AND inbox_id = ${inboxId}::uuid
        AND status = 'open'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!convRows[0]) {
      convRows = await sql`
        INSERT INTO conversations (account_id, inbox_id, contact_id)
        VALUES (${inbox.accountId}::uuid, ${inboxId}::uuid, ${link.contactId}::uuid)
        RETURNING id
      `;
    }

    return Response.json(
      {
        conversationId: (convRows[0] as { id: string }).id,
        visitorToken: link.visitorToken,
        contact: { id: link.contactId, name },
      },
      { headers: corsHeaders() }
    );
  }

  const contactRows = await sql`
    INSERT INTO contacts (account_id, name, email, type, last_activity_at)
    VALUES (${inbox.accountId}::uuid, ${name}, ${email}, 'visitor', NOW())
    RETURNING id, name
  `;
  const contact = contactRows[0] as { id: string; name: string } | undefined;
  if (!contact) {
    return Response.json({ error: 'Failed to create contact' }, { status: 500, headers: corsHeaders() });
  }

  const visitorToken = newVisitorToken();
  await sql`
    INSERT INTO contact_inboxes (contact_id, inbox_id, source_id, visitor_token)
    VALUES (${contact.id}::uuid, ${inboxId}::uuid, ${sourceId}, ${visitorToken})
  `;

  const convRows = await sql`
    INSERT INTO conversations (account_id, inbox_id, contact_id)
    VALUES (${inbox.accountId}::uuid, ${inboxId}::uuid, ${contact.id}::uuid)
    RETURNING id
  `;

  return Response.json(
    {
      conversationId: (convRows[0] as { id: string }).id,
      visitorToken,
      contact: { id: contact.id, name: contact.name },
    },
    { status: 201, headers: corsHeaders() }
  );
}
