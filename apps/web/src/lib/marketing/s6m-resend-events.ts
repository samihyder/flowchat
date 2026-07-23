import type { AppSql } from '@/lib/db-sql';
import { suppressEmail } from '@/lib/marketing/suppressions';
import { skipPendingStepsForRecipient, stopRecipientForReply } from '@/lib/marketing/s6m-campaign-dispatch';

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: {
      message?: string;
      type?: string;
      subType?: string;
    };
  };
};

/**
 * Classify Resend bounce / delay events (S6M-10 / S6M-36).
 * Prefer `bounce.type` (Permanent | Transient | Temporary); fall back to message text.
 * `email.delivery_delayed` is always soft; bare `email.bounced` defaults to hard.
 */
export function classifyBounce(
  eventType: string,
  bounce?: { message?: string; type?: string; subType?: string } | null
): 'hard' | 'soft' {
  if (eventType === 'email.delivery_delayed') return 'soft';

  const bounceType = (bounce?.type ?? '').toLowerCase().trim();
  if (bounceType === 'permanent' || bounceType === 'hard') return 'hard';
  if (
    bounceType === 'transient' ||
    bounceType === 'temporary' ||
    bounceType === 'soft'
  ) {
    return 'soft';
  }

  const message = (bounce?.message ?? '').toLowerCase();
  if (
    message.includes('soft bounce') ||
    message.includes('mailbox full') ||
    message.includes('temporary') ||
    message.includes('try again later') ||
    /\b4\d{2}\b/.test(message)
  ) {
    return 'soft';
  }
  if (
    message.includes('hard bounce') ||
    message.includes('does not exist') ||
    message.includes('user unknown') ||
    message.includes('mailbox unavailable') ||
    /\b5\d{2}\b/.test(message)
  ) {
    return 'hard';
  }

  // Resend documents email.bounced as permanent rejection.
  return 'hard';
}

async function logS6mActivity(
  sql: AppSql,
  campaignId: string,
  eventType: string,
  payload: Record<string, unknown>,
  recipientId?: string
) {
  await sql`
    INSERT INTO marketing_campaign_activity (campaign_id, recipient_id, event_type, payload)
    VALUES (
      ${campaignId}::uuid,
      ${recipientId ?? null}::uuid,
      ${eventType},
      ${JSON.stringify(payload)}::jsonb
    )
  `;
}

async function getCampaignHandlingFlags(sql: AppSql, campaignId: string) {
  const rows = await sql`
    SELECT auto_mark_bounced as "autoMarkBounced", process_unsubscribes as "processUnsubscribes"
    FROM marketing_campaigns WHERE id = ${campaignId}::uuid LIMIT 1
  `;
  const row = rows[0] as { autoMarkBounced: boolean; processUnsubscribes: boolean } | undefined;
  return {
    autoMarkBounced: row?.autoMarkBounced !== false,
    processUnsubscribes: row?.processUnsubscribes !== false,
  };
}

async function findS6mStepByMessageId(sql: AppSql, messageId: string) {
  const rows = await sql`
    SELECT
      rs.id as "stepRowId",
      rs.campaign_id as "campaignId",
      rs.recipient_id as "recipientId",
      rs.status,
      r.contact_id as "contactId",
      c.account_id as "accountId",
      r.email
    FROM marketing_campaign_recipient_steps rs
    INNER JOIN marketing_campaign_recipients r ON r.id = rs.recipient_id
    INNER JOIN marketing_campaigns c ON c.id = rs.campaign_id
    WHERE rs.provider_message_id = ${messageId}
    LIMIT 1
  `;
  return rows[0] as
    | {
        stepRowId: string;
        campaignId: string;
        recipientId: string;
        status: string;
        contactId: string;
        accountId: string;
        email: string;
      }
    | undefined;
}

function statusRank(status: string): number {
  const ranks: Record<string, number> = {
    pending: 0,
    queued: 0,
    sent: 1,
    delivered: 2,
    opened: 3,
    clicked: 4,
  };
  return ranks[status] ?? 0;
}

async function promoteStepStatus(sql: AppSql, stepRowId: string, next: string, current: string) {
  if (statusRank(next) <= statusRank(current) && !next.startsWith('stopped_')) return;
  await sql`
    UPDATE marketing_campaign_recipient_steps
    SET status = ${next}, updated_at = NOW()
    WHERE id = ${stepRowId}::uuid
  `;
}

export async function handleS6mResendWebhookEvent(sql: AppSql, event: ResendEvent): Promise<boolean> {
  const messageId = event.data?.email_id;
  if (!messageId) return false;

  const step = await findS6mStepByMessageId(sql, messageId);
  if (!step) return false;

  const type = event.type;
  const { stepRowId, campaignId, recipientId, accountId, contactId, email, status } = step;

  if (type === 'email.delivered') {
    await promoteStepStatus(sql, stepRowId, 'delivered', status);
    await logS6mActivity(sql, campaignId, 'step_delivered', { messageId }, recipientId);
    return true;
  }

  if (type === 'email.opened') {
    await promoteStepStatus(sql, stepRowId, 'opened', status);
    await logS6mActivity(sql, campaignId, 'step_opened', { messageId }, recipientId);
    return true;
  }

  if (type === 'email.clicked') {
    await promoteStepStatus(sql, stepRowId, 'clicked', status);
    await logS6mActivity(sql, campaignId, 'step_clicked', { messageId }, recipientId);
    return true;
  }

  if (type === 'email.bounced' || type === 'email.delivery_delayed') {
    const retryRows = await sql`
      SELECT retry_count as "retryCount"
      FROM marketing_campaign_recipient_steps
      WHERE id = ${stepRowId}::uuid
    `;
    const retryCount = Number((retryRows[0] as { retryCount?: number } | undefined)?.retryCount ?? 0);
    const kind = classifyBounce(type, event.data?.bounce);

    // Soft: retry once (S6M-36). Hard or exhausted soft: stop + suppress.
    if (kind === 'soft' && retryCount < 1) {
      await sql`
        UPDATE marketing_campaign_recipient_steps
        SET
          status = 'pending',
          retry_count = retry_count + 1,
          scheduled_at = NOW() + INTERVAL '4 hours',
          updated_at = NOW()
        WHERE id = ${stepRowId}::uuid
      `;
      await logS6mActivity(
        sql,
        campaignId,
        'soft_bounce',
        {
          messageId,
          retryCount: retryCount + 1,
          bounceType: event.data?.bounce?.type ?? null,
          bounceSubType: event.data?.bounce?.subType ?? null,
          eventType: type,
        },
        recipientId
      );
      return true;
    }

    await sql`
      UPDATE marketing_campaign_recipient_steps
      SET status = 'stopped_bounce', updated_at = NOW()
      WHERE id = ${stepRowId}::uuid
    `;
    const bounceFlags = await getCampaignHandlingFlags(sql, campaignId);
    if (bounceFlags.autoMarkBounced) {
      await skipPendingStepsForRecipient(sql, recipientId, 'bounce');
      await suppressEmail(sql, accountId, email, 'bounced');
      await logS6mActivity(
        sql,
        campaignId,
        'recipient_stop',
        {
          reason: 'bounce',
          messageId,
          bounceKind: kind,
          bounceType: event.data?.bounce?.type ?? null,
        },
        recipientId
      );
    } else {
      await logS6mActivity(sql, campaignId, 'bounce_ignored', { messageId, bounceKind: kind }, recipientId);
    }
    return true;
  }

  if (type === 'email.complained') {
    await sql`
      UPDATE marketing_campaign_recipient_steps
      SET status = 'stopped_complaint', updated_at = NOW()
      WHERE id = ${stepRowId}::uuid
    `;
    await skipPendingStepsForRecipient(sql, recipientId, 'complaint');
    await suppressEmail(sql, accountId, email, 'complained');
    await logS6mActivity(sql, campaignId, 'complaint', { messageId }, recipientId);
    await logS6mActivity(sql, campaignId, 'recipient_stop', { reason: 'complaint', messageId }, recipientId);
    return true;
  }

  if (type === 'email.replied' || type === 'email.received') {
    await stopRecipientForReply(sql, recipientId, campaignId, messageId);
    return true;
  }

  if (type === 'email.unsubscribed') {
    const unsubFlags = await getCampaignHandlingFlags(sql, campaignId);
    if (!unsubFlags.processUnsubscribes) {
      await logS6mActivity(sql, campaignId, 'unsubscribe_ignored', { messageId }, recipientId);
      return true;
    }
    await skipPendingStepsForRecipient(sql, recipientId, 'unsubscribe');
    await sql`
      UPDATE marketing_campaign_recipient_steps
      SET status = 'stopped_unsubscribe', updated_at = NOW()
      WHERE recipient_id = ${recipientId}::uuid
        AND status IN ('sent', 'delivered', 'opened', 'clicked')
    `;
    await suppressEmail(sql, accountId, email, 'unsubscribed');
    await logS6mActivity(sql, campaignId, 'recipient_stop', { reason: 'unsubscribe', messageId }, recipientId);
    return true;
  }

  return false;
}

export async function handleS6mUnsubscribe(
  sql: AppSql,
  accountId: string,
  contactId: string,
  email: string
) {
  const recipients = await sql`
    SELECT r.id as "recipientId", r.campaign_id as "campaignId"
    FROM marketing_campaign_recipients r
    INNER JOIN marketing_campaigns c ON c.id = r.campaign_id
    WHERE c.account_id = ${accountId}::uuid
      AND r.contact_id = ${contactId}::uuid
      AND r.stopped_reason IS NULL
      AND c.status IN ('running', 'scheduled', 'paused')
  `;

  for (const row of recipients as { recipientId: string; campaignId: string }[]) {
    await skipPendingStepsForRecipient(sql, row.recipientId, 'unsubscribe');
    await sql`
      UPDATE marketing_campaign_recipient_steps
      SET status = 'stopped_unsubscribe', updated_at = NOW()
      WHERE recipient_id = ${row.recipientId}::uuid
        AND status IN ('sent', 'delivered', 'opened', 'clicked')
    `;
    await logS6mActivity(sql, row.campaignId, 'recipient_stop', { reason: 'unsubscribe' }, row.recipientId);
  }

  await suppressEmail(sql, accountId, email, 'unsubscribed');
}
