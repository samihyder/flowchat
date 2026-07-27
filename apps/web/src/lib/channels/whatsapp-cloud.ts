import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppSql } from '@/lib/db-sql';
import { emitPlatformEvent } from '@/lib/platform-events';
import {
  packEncryptedSecret,
  unpackEncryptedSecret,
} from '@/lib/credentials/encryption';

export type WhatsAppInboxConfig = {
  inboxId: string;
  accountId: string;
  provider: string;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhone: string | null;
  verifyToken: string;
  webhookSubscribed: boolean;
  lastHealthAt: string | null;
  healthStatus: string;
  hasAccessToken: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppConfigInput = {
  wabaId?: string | null;
  phoneNumberId?: string | null;
  displayPhone?: string | null;
  /** Plain access token; encrypted at rest before storage. */
  accessToken?: string | null;
  /** @deprecated Prefer accessToken — plaintext values are still accepted and encrypted. */
  accessTokenEncrypted?: string | null;
  verifyToken?: string | null;
  /** Plain Meta app secret; encrypted at rest before storage. */
  appSecret?: string | null;
  /** @deprecated Prefer appSecret — plaintext values are still accepted and encrypted. */
  appSecretEncrypted?: string | null;
  webhookSubscribed?: boolean;
};

type ConfigRow = {
  inboxId: string;
  accountId: string;
  provider: string;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhone: string | null;
  verifyToken: string;
  webhookSubscribed: boolean;
  lastHealthAt: Date | string | null;
  healthStatus: string;
  accessTokenEncrypted: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: ConfigRow): WhatsAppInboxConfig {
  return {
    inboxId: row.inboxId,
    accountId: row.accountId,
    provider: row.provider,
    wabaId: row.wabaId,
    phoneNumberId: row.phoneNumberId,
    displayPhone: row.displayPhone,
    verifyToken: row.verifyToken,
    webhookSubscribed: row.webhookSubscribed,
    lastHealthAt: row.lastHealthAt ? new Date(row.lastHealthAt).toISOString() : null,
    healthStatus: row.healthStatus,
    hasAccessToken: Boolean(row.accessTokenEncrypted),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function getWhatsAppInboxConfig(
  sql: AppSql,
  accountId: string,
  inboxId: string
): Promise<WhatsAppInboxConfig | null> {
  const rows = await sql`
    SELECT inbox_id as "inboxId", account_id as "accountId", provider,
           waba_id as "wabaId", phone_number_id as "phoneNumberId",
           display_phone as "displayPhone", verify_token as "verifyToken",
           webhook_subscribed as "webhookSubscribed",
           last_health_at as "lastHealthAt", health_status as "healthStatus",
           access_token_encrypted as "accessTokenEncrypted",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM inbox_whatsapp_configs
    WHERE inbox_id = ${inboxId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as ConfigRow | undefined;
  return row ? serialize(row) : null;
}

export async function upsertWhatsAppInboxConfig(
  sql: AppSql,
  accountId: string,
  inboxId: string,
  input: WhatsAppConfigInput
): Promise<WhatsAppInboxConfig> {
  const inbox = await sql`
    SELECT id FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!inbox[0]) throw new Error('Inbox not found');

  const plainToken = (input.accessToken ?? input.accessTokenEncrypted)?.trim() || null;
  const plainAppSecret = (input.appSecret ?? input.appSecretEncrypted)?.trim() || null;
  const packedToken = plainToken ? packEncryptedSecret(plainToken) : null;
  const packedAppSecret = plainAppSecret ? packEncryptedSecret(plainAppSecret) : null;

  const rows = await sql`
    INSERT INTO inbox_whatsapp_configs (
      inbox_id, account_id, waba_id, phone_number_id, display_phone,
      access_token_encrypted, verify_token, app_secret_encrypted, webhook_subscribed
    )
    VALUES (
      ${inboxId}::uuid, ${accountId}::uuid,
      ${input.wabaId ?? null}, ${input.phoneNumberId ?? null}, ${input.displayPhone ?? null},
      ${packedToken},
      COALESCE(${input.verifyToken ?? null}, encode(gen_random_bytes(16), 'hex')),
      ${packedAppSecret},
      ${input.webhookSubscribed ?? false}
    )
    ON CONFLICT (inbox_id) DO UPDATE SET
      waba_id = COALESCE(${input.wabaId ?? null}, inbox_whatsapp_configs.waba_id),
      phone_number_id = COALESCE(${input.phoneNumberId ?? null}, inbox_whatsapp_configs.phone_number_id),
      display_phone = COALESCE(${input.displayPhone ?? null}, inbox_whatsapp_configs.display_phone),
      access_token_encrypted = COALESCE(${packedToken}, inbox_whatsapp_configs.access_token_encrypted),
      verify_token = COALESCE(${input.verifyToken ?? null}, inbox_whatsapp_configs.verify_token),
      app_secret_encrypted = COALESCE(${packedAppSecret}, inbox_whatsapp_configs.app_secret_encrypted),
      webhook_subscribed = COALESCE(${input.webhookSubscribed ?? null}, inbox_whatsapp_configs.webhook_subscribed),
      updated_at = NOW()
    RETURNING inbox_id as "inboxId", account_id as "accountId", provider,
              waba_id as "wabaId", phone_number_id as "phoneNumberId",
              display_phone as "displayPhone", verify_token as "verifyToken",
              webhook_subscribed as "webhookSubscribed",
              last_health_at as "lastHealthAt", health_status as "healthStatus",
              access_token_encrypted as "accessTokenEncrypted",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serialize(rows[0] as ConfigRow);
}

export function verifyWhatsAppWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expectedVerifyToken: string
): string | null {
  if (mode === 'subscribe' && token === expectedVerifyToken && challenge) {
    return challenge;
  }
  return null;
}

/** Verify Meta X-Hub-Signature-256 against the app secret. */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type MetaWebhookBody = {
  object?: string;
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
};

export async function ingestWhatsAppWebhook(
  sql: AppSql,
  body: MetaWebhookBody,
  opts?: { expectedInboxId?: string }
): Promise<{ processed: number; deduped: number }> {
  let processed = 0;
  let deduped = 0;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.messages?.length) continue;

      const cfgRows = await sql`
        SELECT inbox_id as "inboxId", account_id as "accountId"
        FROM inbox_whatsapp_configs
        WHERE phone_number_id = ${phoneNumberId}
        LIMIT 1
      `;
      const cfg = cfgRows[0] as { inboxId: string; accountId: string } | undefined;
      if (!cfg) continue;
      if (opts?.expectedInboxId && cfg.inboxId !== opts.expectedInboxId) continue;

      for (const msg of value.messages) {
        if (!msg.id || !msg.from) continue;
        if (msg.type && msg.type !== 'text') continue;

        const existing = await sql`
          SELECT id FROM messages
          WHERE account_id = ${cfg.accountId}::uuid AND channel_provider_id = ${msg.id}
          LIMIT 1
        `;
        if (existing[0]) {
          deduped += 1;
          continue;
        }

        const waId = msg.from;
        const profileName =
          value.contacts?.find((c) => c.wa_id === waId)?.profile?.name ?? waId;

        let contactRows = await sql`
          SELECT id FROM contacts
          WHERE account_id = ${cfg.accountId}::uuid
            AND (phone = ${waId} OR phone = ${`+${waId}`} OR external_id = ${waId})
          LIMIT 1
        `;
        let contactId = (contactRows[0] as { id: string } | undefined)?.id;
        if (!contactId) {
          const created = await sql`
            INSERT INTO contacts (account_id, name, phone, external_id, type, last_activity_at)
            VALUES (${cfg.accountId}::uuid, ${profileName}, ${waId}, ${waId}, 'lead', NOW())
            RETURNING id
          `;
          contactId = (created[0] as { id: string }).id;
        }

        let convRows = await sql`
          SELECT id FROM conversations
          WHERE account_id = ${cfg.accountId}::uuid
            AND inbox_id = ${cfg.inboxId}::uuid
            AND contact_id = ${contactId}::uuid
            AND status != 'resolved'
          ORDER BY updated_at DESC
          LIMIT 1
        `;
        let conversationId = (convRows[0] as { id: string } | undefined)?.id;
        let isNewConversation = false;
        if (!conversationId) {
          const created = await sql`
            INSERT INTO conversations (account_id, inbox_id, contact_id, status, priority, channel_window_expires_at)
            VALUES (
              ${cfg.accountId}::uuid, ${cfg.inboxId}::uuid, ${contactId}::uuid,
              'open', 'medium', NOW() + INTERVAL '24 hours'
            )
            RETURNING id
          `;
          conversationId = (created[0] as { id: string }).id;
          isNewConversation = true;
        } else {
          await sql`
            UPDATE conversations SET
              channel_window_expires_at = NOW() + INTERVAL '24 hours',
              status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END,
              updated_at = NOW()
            WHERE id = ${conversationId}::uuid
          `;
        }

        const content = msg.text?.body?.trim() || '(unsupported message)';
        await sql`
          INSERT INTO messages (
            conversation_id, account_id, content, sender_type, sender_id,
            channel_provider_id, delivery_status
          )
          VALUES (
            ${conversationId}::uuid, ${cfg.accountId}::uuid, ${content},
            'contact', ${contactId}::uuid, ${msg.id}, 'received'
          )
        `;
        await sql`
          UPDATE conversations SET
            last_activity_at = NOW(), updated_at = NOW(),
            unread_count = unread_count + 1,
            channel_window_expires_at = NOW() + INTERVAL '24 hours'
          WHERE id = ${conversationId}::uuid
        `;
        if (isNewConversation) {
          void emitPlatformEvent(sql, cfg.accountId, 'conversation.created', {
            conversationId,
            inboxId: cfg.inboxId,
            contactId,
          });
        }
        void emitPlatformEvent(sql, cfg.accountId, 'message.created', {
          conversationId,
          inboxId: cfg.inboxId,
          contactId,
          senderType: 'contact',
        });
        processed += 1;
      }
    }
  }

  return { processed, deduped };
}

export async function sendWhatsAppText(
  sql: AppSql,
  accountId: string,
  conversationId: string,
  text: string,
  opts?: { isTemplate?: boolean }
): Promise<{ messageId: string; deliveryStatus: string; error?: string }> {
  const conv = await sql`
    SELECT c.id, c.inbox_id as "inboxId", c.channel_window_expires_at as "windowExpires",
           ct.phone, ct.external_id as "externalId"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = ${conversationId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = conv[0] as
    | {
        id: string;
        inboxId: string;
        windowExpires: Date | string | null;
        phone: string | null;
        externalId: string | null;
      }
    | undefined;
  if (!row) throw new Error('Conversation not found');

  const windowExpires = row.windowExpires ? new Date(row.windowExpires) : null;
  if (!opts?.isTemplate && (!windowExpires || windowExpires.getTime() < Date.now())) {
    return {
      messageId: '',
      deliveryStatus: 'blocked',
      error: 'WhatsApp 24h messaging window expired; use a template message',
    };
  }

  const cfgRows = await sql`
    SELECT phone_number_id as "phoneNumberId",
           access_token_encrypted as "accessTokenEncrypted"
    FROM inbox_whatsapp_configs
    WHERE inbox_id = ${row.inboxId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const cfg = cfgRows[0] as
    | { phoneNumberId: string | null; accessTokenEncrypted: string | null }
    | undefined;
  const accessToken = unpackEncryptedSecret(cfg?.accessTokenEncrypted ?? null);

  const to = (row.externalId || row.phone || '').replace(/^\+/, '');
  let deliveryStatus = 'sent_local';
  let providerId: string | null = null;
  let error: string | undefined;

  if (accessToken && cfg?.phoneNumberId && to) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (res.ok && data.messages?.[0]?.id) {
      deliveryStatus = 'sent';
      providerId = data.messages[0].id;
    } else {
      deliveryStatus = 'failed';
      error = data.error?.message ?? `Graph API error (${res.status})`;
    }
  }

  const msgs = await sql`
    INSERT INTO messages (
      conversation_id, account_id, content, sender_type,
      channel_provider_id, delivery_status
    )
    VALUES (
      ${conversationId}::uuid, ${accountId}::uuid, ${text}, 'agent',
      ${providerId}, ${deliveryStatus}
    )
    RETURNING id
  `;

  await sql`
    UPDATE conversations SET last_activity_at = NOW(), updated_at = NOW()
    WHERE id = ${conversationId}::uuid
  `;

  return {
    messageId: (msgs[0] as { id: string }).id,
    deliveryStatus,
    error,
  };
}
