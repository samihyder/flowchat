import type { AppSql } from '@/lib/db-sql';
import { refreshCampaignStats } from '@/lib/marketing/campaign-dispatch';

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: { message?: string };
  };
};

export async function handleResendWebhookEvent(sql: AppSql, event: ResendEvent) {
  const messageId = event.data?.email_id;
  if (!messageId) return;

  const recipients = await sql`
    SELECT r.id, r.campaign_id as "campaignId", r.contact_id as "contactId",
           c.account_id as "accountId", r.status
    FROM email_campaign_recipients r
    LEFT JOIN contacts c ON c.id = r.contact_id
    WHERE r.resend_message_id = ${messageId}
    LIMIT 1
  `;
  const recipient = recipients[0] as
    | {
        id: string;
        campaignId: string;
        contactId: string | null;
        accountId: string | null;
        status: string;
      }
    | undefined;
  if (!recipient) return;

  const type = event.type;
  const accountId = recipient.accountId;
  const contactId = recipient.contactId;
  const campaignId = recipient.campaignId;

  const logEvent = async (eventType: string, subject?: string | null) => {
    if (!accountId) return;
    await sql`
      INSERT INTO contact_email_events (account_id, contact_id, campaign_id, event_type, subject, metadata)
      VALUES (
        ${accountId}::uuid,
        ${contactId}::uuid,
        ${campaignId}::uuid,
        ${eventType},
        ${subject ?? null},
        ${JSON.stringify({ resendMessageId: messageId, resendType: type })}::jsonb
      )
    `;
  };

  if (type === 'email.delivered') {
    await sql`
      UPDATE email_campaign_recipients SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW())
      WHERE id = ${recipient.id}::uuid AND status IN ('sent', 'delivered', 'opened', 'clicked')
    `;
    await logEvent('delivered');
  } else if (type === 'email.opened') {
    await sql`
      UPDATE email_campaign_recipients SET status = 'opened', opened_at = COALESCE(opened_at, NOW()),
        delivered_at = COALESCE(delivered_at, NOW())
      WHERE id = ${recipient.id}::uuid
    `;
    await logEvent('opened');
  } else if (type === 'email.clicked') {
    await sql`
      UPDATE email_campaign_recipients SET status = 'clicked', clicked_at = COALESCE(clicked_at, NOW()),
        opened_at = COALESCE(opened_at, NOW()), delivered_at = COALESCE(delivered_at, NOW())
      WHERE id = ${recipient.id}::uuid
    `;
    await logEvent('clicked');
  } else if (type === 'email.bounced') {
    await sql`
      UPDATE email_campaign_recipients SET status = 'bounced', bounced_at = NOW(),
        error_message = ${event.data?.bounce?.message ?? 'Bounced'}
      WHERE id = ${recipient.id}::uuid
    `;
    if (contactId && accountId) {
      await sql`
        UPDATE contacts SET marketing_status = 'bounced', updated_at = NOW()
        WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
      `;
    }
    await logEvent('bounced');
  } else if (type === 'email.complained') {
    await sql`
      UPDATE email_campaign_recipients SET status = 'complained', complained_at = NOW()
      WHERE id = ${recipient.id}::uuid
    `;
    if (contactId && accountId) {
      await sql`
        UPDATE contacts SET marketing_status = 'complained', updated_at = NOW()
        WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
      `;
    }
    await logEvent('complained');
  }

  await refreshCampaignStats(sql, campaignId);
}
