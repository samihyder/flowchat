import { corsHeaders, optionsResponse } from '@/lib/cors';
import { newVisitorToken } from '@/lib/conversations';
import { dispatchWebhooks } from '@/lib/webhooks';
import { getClientIp } from '@/lib/request-ip';
import { guardPublicInboxRequest } from '@/lib/public-inbox-guard';
import { pickRoundRobinAssignee } from '@/lib/assign';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ inboxId: string }> };

async function resolveAssignee(
  sql: AppSql,
  inboxId: string,
  accountId: string,
  roundRobinEnabled: boolean,
  defaultAssigneeId: string | null
) {
  if (roundRobinEnabled) {
    return pickRoundRobinAssignee(sql, inboxId, accountId);
  }
  return defaultAssigneeId;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const body = (await req.json()) as {
    sourceId?: string;
    name?: string;
    email?: string;
    preChatData?: Record<string, string>;
  };
  const sourceId = body.sourceId?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim() || null;

  if (!sourceId || sourceId.length < 8) {
    return Response.json({ error: 'Invalid sourceId' }, { status: 400, headers: corsHeaders() });
  }
  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders() });
  }

  const guard = await guardPublicInboxRequest(req, inboxId, 'session', sourceId);
  if (!guard.ok) {
    const headers = { ...corsHeaders(), ...(guard.response.headers as Headers) };
    return new Response(guard.response.body, { status: guard.response.status, headers });
  }

  const sql = guard.sql;
  const clientIp = getClientIp(req);

  const inboxes = (await sql`
    SELECT id, account_id as "accountId", default_assignee_id as "defaultAssigneeId",
           round_robin_enabled as "roundRobinEnabled"
    FROM inboxes
    WHERE id = ${inboxId}::uuid AND is_enabled = true LIMIT 1
  `) as {
    id: string;
    accountId: string;
    defaultAssigneeId: string | null;
    roundRobinEnabled: boolean;
  }[];
  const inbox = inboxes[0];
  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
  }

  const existing = (await sql`
    SELECT ci.visitor_token as "visitorToken", c.id as "contactId", c.name, c.email, c.is_blocked as "isBlocked"
    FROM contact_inboxes ci
    INNER JOIN contacts c ON c.id = ci.contact_id
    WHERE ci.inbox_id = ${inboxId}::uuid AND ci.source_id = ${sourceId}
    LIMIT 1
  `) as {
      visitorToken: string;
      contactId: string;
      name: string;
      email: string | null;
      isBlocked: boolean;
    }[];

  if (existing[0]) {
    const link = existing[0];

    if (link.isBlocked) {
      return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders() });
    }

    if (name !== link.name || (email && email !== link.email)) {
      await sql`
        UPDATE contacts SET name = ${name}, email = COALESCE(${email}, email), updated_at = NOW()
        WHERE id = ${link.contactId}::uuid
      `;
    }

    let convRows = (await sql`
      SELECT id FROM conversations
      WHERE contact_id = ${link.contactId}::uuid
        AND inbox_id = ${inboxId}::uuid
        AND status = 'open'
      ORDER BY created_at DESC LIMIT 1
    `) as { id: string }[];

    if (!convRows[0]) {
      const assigneeId = await resolveAssignee(
        sql,
        inboxId,
        inbox.accountId,
        inbox.roundRobinEnabled,
        inbox.defaultAssigneeId
      );
      convRows = (await sql`
        INSERT INTO conversations (account_id, inbox_id, contact_id, assignee_id)
        VALUES (
          ${inbox.accountId}::uuid,
          ${inboxId}::uuid,
          ${link.contactId}::uuid,
          ${assigneeId}::uuid
        )
        RETURNING id
      `) as { id: string }[];

      void dispatchWebhooks(sql, inbox.accountId, 'conversation.created', {
        conversationId: convRows[0]!.id,
        inboxId,
        contactId: link.contactId,
      });
    }

    if (body.preChatData && Object.keys(body.preChatData).length > 0) {
      await sql`
        UPDATE contact_inboxes SET pre_chat_data = ${JSON.stringify(body.preChatData)}::jsonb
        WHERE inbox_id = ${inboxId}::uuid AND source_id = ${sourceId}
      `;
    }

    if (clientIp) {
      await sql`
        UPDATE contact_inboxes SET last_ip_address = ${clientIp}, last_seen_at = NOW()
        WHERE inbox_id = ${inboxId}::uuid AND source_id = ${sourceId}
      `;
    }

    return Response.json(
      {
        conversationId: convRows[0]!.id,
        visitorToken: link.visitorToken,
        contact: { id: link.contactId, name },
      },
      { headers: corsHeaders() }
    );
  }

  const contactRows = (await sql`
    INSERT INTO contacts (account_id, name, email, type, last_activity_at)
    VALUES (${inbox.accountId}::uuid, ${name}, ${email}, 'visitor', NOW())
    RETURNING id, name
  `) as { id: string; name: string }[];
  const contact = contactRows[0];
  if (!contact) {
    return Response.json({ error: 'Failed to create contact' }, { status: 500, headers: corsHeaders() });
  }

  const visitorToken = newVisitorToken();
  await sql`
    INSERT INTO contact_inboxes (contact_id, inbox_id, source_id, visitor_token, last_ip_address, last_seen_at)
    VALUES (
      ${contact.id}::uuid,
      ${inboxId}::uuid,
      ${sourceId},
      ${visitorToken},
      ${clientIp},
      NOW()
    )
  `;

  const assigneeId = await resolveAssignee(
    sql,
    inboxId,
    inbox.accountId,
    inbox.roundRobinEnabled,
    inbox.defaultAssigneeId
  );

  const convRows = (await sql`
    INSERT INTO conversations (account_id, inbox_id, contact_id, assignee_id)
    VALUES (
      ${inbox.accountId}::uuid,
      ${inboxId}::uuid,
      ${contact.id}::uuid,
      ${assigneeId}::uuid
    )
    RETURNING id
  `) as { id: string }[];

  if (body.preChatData && Object.keys(body.preChatData).length > 0) {
    await sql`
      UPDATE contact_inboxes SET pre_chat_data = ${JSON.stringify(body.preChatData)}::jsonb
      WHERE inbox_id = ${inboxId}::uuid AND source_id = ${sourceId}
    `;
  }

  void dispatchWebhooks(sql, inbox.accountId, 'conversation.created', {
    conversationId: convRows[0]!.id,
    inboxId,
    contactId: contact.id,
  });

  return Response.json(
    {
      conversationId: convRows[0]!.id,
      visitorToken,
      contact: { id: contact.id, name: contact.name },
    },
    { status: 201, headers: corsHeaders() }
  );
}
