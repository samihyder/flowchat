import { createHmac } from 'node:crypto';
import type { AppSql } from '@/lib/db-sql';

export type WebhookEvent =
  | 'conversation.created'
  | 'message.created'
  | 'conversation.resolved'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted';

export async function dispatchWebhooks(
  sql: AppSql,
  accountId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const hooks = await sql`
    SELECT id, url, secret, events
    FROM account_webhooks
    WHERE account_id = ${accountId}::uuid AND enabled = true
  `;

  for (const hook of hooks as { id: string; url: string; secret: string; events: string[] }[]) {
    const events = Array.isArray(hook.events) ? hook.events : [];
    if (!events.includes(event)) continue;

    const body = JSON.stringify({ event, accountId, payload, timestamp: new Date().toISOString() });
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

    const deliveryRows = await sql`
      INSERT INTO webhook_deliveries (webhook_id, event, payload, status)
      VALUES (${hook.id}::uuid, ${event}, ${body}::jsonb, 'pending')
      RETURNING id
    `;
    const deliveryId = (deliveryRows[0] as { id: string } | undefined)?.id;

    void fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FlowChat-Signature': signature,
        'X-FlowChat-Event': event,
      },
      body,
    })
      .then(async (res) => {
        if (res.ok) {
          await sql`
            UPDATE webhook_deliveries SET status = 'delivered', delivered_at = NOW(), attempts = attempts + 1
            WHERE id = ${deliveryId}::uuid
          `;
        } else {
          const err = await res.text().catch(() => 'HTTP error');
          await sql`
            UPDATE webhook_deliveries SET status = 'failed', attempts = attempts + 1, last_error = ${err.slice(0, 500)}
            WHERE id = ${deliveryId}::uuid
          `;
        }
      })
      .catch(async (err: Error) => {
        await sql`
          UPDATE webhook_deliveries SET status = 'failed', attempts = attempts + 1, last_error = ${err.message.slice(0, 500)}
          WHERE id = ${deliveryId}::uuid
        `;
      });
  }
}
