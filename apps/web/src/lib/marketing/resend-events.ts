import type { AppSql } from '@/lib/db-sql';
import { refreshCampaignStats } from '@/lib/marketing/campaign-dispatch';
import { suppressEmail } from '@/lib/marketing/suppressions';

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: { message?: string };
  };
};

async function logContactEvent(
  sql: AppSql,
  accountId: string,
  contactId: string | null,
  campaignId: string | null,
  eventType: string,
  subject: string | null,
  metadata: Record<string, unknown>
) {
  if (!accountId) return;

  if (eventType === 'opened' || eventType === 'clicked') {
    if (!metadata.workflowId && contactId) {
      const last = await sql`
        SELECT metadata FROM contact_email_events
        WHERE contact_id = ${contactId}::uuid AND event_type = 'workflow_sent'
        ORDER BY created_at DESC LIMIT 1
      `;
      const wid = (last[0] as { metadata?: { workflowId?: string } } | undefined)?.metadata?.workflowId;
      if (wid) metadata.workflowId = wid;
    }
  }

  await sql`
    INSERT INTO contact_email_events (account_id, contact_id, campaign_id, event_type, subject, metadata)
    VALUES (
      ${accountId}::uuid,
      ${contactId}::uuid,
      ${campaignId}::uuid,
      ${eventType},
      ${subject},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}

export async function handleResendWebhookEvent(sql: AppSql, event: ResendEvent) {
  const messageId = event.data?.email_id;
  if (!messageId) return;

  const recipients = await sql`
    SELECT r.id, r.campaign_id as "campaignId", r.contact_id as "contactId",
           c.account_id as "accountId", r.status
    FROM email_campaign_recipients r
    LEFT JOIN contacts c ON c.id = r.contact_id
    WHERE r.resend_message_id = ${messageId}
       OR r.provider_message_id = ${messageId}
    LIMIT 1
  `;
  let recipient = recipients[0] as
    | {
        id: string;
        campaignId: string;
        contactId: string | null;
        accountId: string | null;
        status: string;
      }
    | undefined;

  let accountId = recipient?.accountId ?? null;
  let contactId = recipient?.contactId ?? null;
  const campaignId = recipient?.campaignId ?? null;
  let workflowId: string | undefined;

  if (!recipient && messageId) {
    const workflowSend = await sql`
      SELECT contact_id as "contactId", account_id as "accountId", metadata
      FROM contact_email_events
      WHERE event_type = 'workflow_sent'
        AND metadata->>'messageId' = ${messageId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const ws = workflowSend[0] as
      | { contactId: string; accountId: string; metadata?: { workflowId?: string } }
      | undefined;
    if (ws) {
      accountId = ws.accountId;
      contactId = ws.contactId;
      workflowId = ws.metadata?.workflowId;
    }
  }

  if (!recipient && event.data?.to?.[0]) {
    const email = event.data.to[0];
    const contacts = await sql`
      SELECT id, account_id as "accountId" FROM contacts WHERE lower(email) = lower(${email}) LIMIT 1
    `;
    const c = contacts[0] as { id: string; accountId: string } | undefined;
    if (c) {
      accountId = c.accountId;
      contactId = c.id;
    }
  }

  const type = event.type;
  const meta: Record<string, unknown> = { resendMessageId: messageId, resendType: type };
  if (workflowId) meta.workflowId = workflowId;
  if (!accountId) return;

  if (type === 'email.delivered') {
    if (recipient) {
      await sql`
        UPDATE email_campaign_recipients SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW())
        WHERE id = ${recipient.id}::uuid AND status IN ('sent', 'delivered', 'opened', 'clicked')
      `;
    }
    await logContactEvent(sql, accountId, contactId, campaignId, 'delivered', null, meta);
  } else if (type === 'email.opened') {
    if (recipient) {
      await sql`
        UPDATE email_campaign_recipients SET status = 'opened', opened_at = COALESCE(opened_at, NOW()),
          delivered_at = COALESCE(delivered_at, NOW())
        WHERE id = ${recipient.id}::uuid
      `;
    }
    await logContactEvent(sql, accountId, contactId, campaignId, 'opened', null, meta);
  } else if (type === 'email.clicked') {
    if (recipient) {
      await sql`
        UPDATE email_campaign_recipients SET status = 'clicked', clicked_at = COALESCE(clicked_at, NOW()),
          opened_at = COALESCE(opened_at, NOW()), delivered_at = COALESCE(delivered_at, NOW())
        WHERE id = ${recipient.id}::uuid
      `;
    }
    await logContactEvent(sql, accountId, contactId, campaignId, 'clicked', null, meta);
  } else if (type === 'email.bounced') {
    if (recipient) {
      await sql`
        UPDATE email_campaign_recipients SET status = 'bounced', bounced_at = NOW(),
          error_message = ${event.data?.bounce?.message ?? 'Bounced'}
        WHERE id = ${recipient.id}::uuid
      `;
    }
    if (contactId && accountId) {
      const emails = await sql`SELECT email FROM contacts WHERE id = ${contactId}::uuid LIMIT 1`;
      const email = (emails[0] as { email: string } | undefined)?.email;
      if (email) await suppressEmail(sql, accountId, email, 'bounced');
      await sql`
        UPDATE contacts SET marketing_status = 'bounced', updated_at = NOW()
        WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
      `;
    }
    await logContactEvent(sql, accountId, contactId, campaignId, 'bounced', null, meta);
  } else if (type === 'email.complained') {
    if (recipient) {
      await sql`
        UPDATE email_campaign_recipients SET status = 'complained', complained_at = NOW()
        WHERE id = ${recipient.id}::uuid
      `;
    }
    if (contactId && accountId) {
      const emails = await sql`SELECT email FROM contacts WHERE id = ${contactId}::uuid LIMIT 1`;
      const email = (emails[0] as { email: string } | undefined)?.email;
      if (email) await suppressEmail(sql, accountId, email, 'complained');
      await sql`
        UPDATE contacts SET marketing_status = 'complained', updated_at = NOW()
        WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
      `;
    }
    await logContactEvent(sql, accountId, contactId, campaignId, 'complained', null, meta);
  }

  if (campaignId) await refreshCampaignStats(sql, campaignId);
}
