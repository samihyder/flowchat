import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AppSql } from '@/lib/db-sql';
import { emitPlatformEvent } from '@/lib/platform-events';

export type ChannelType = 'facebook' | 'instagram' | 'telegram' | 'sms' | 'api';

export type InboxChannelConfig = {
  inboxId: string;
  accountId: string;
  channelType: string;
  config: Record<string, unknown>;
  healthStatus: string;
  lastHealthAt: string | null;
  tokenExpiresAt: string | null;
  hasSecrets: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChannelConfigInput = {
  channelType: ChannelType | string;
  config?: Record<string, unknown>;
  secretsEncrypted?: string | null;
  healthStatus?: string;
  tokenExpiresAt?: string | null;
};

type ConfigRow = {
  inboxId: string;
  accountId: string;
  channelType: string;
  config: Record<string, unknown>;
  secretsEncrypted: string | null;
  healthStatus: string;
  lastHealthAt: Date | string | null;
  tokenExpiresAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: ConfigRow): InboxChannelConfig {
  return {
    inboxId: row.inboxId,
    accountId: row.accountId,
    channelType: row.channelType,
    config: row.config ?? {},
    healthStatus: row.healthStatus,
    lastHealthAt: row.lastHealthAt ? new Date(row.lastHealthAt).toISOString() : null,
    tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt).toISOString() : null,
    hasSecrets: Boolean(row.secretsEncrypted),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function getChannelConfig(
  sql: AppSql,
  accountId: string,
  inboxId: string
): Promise<InboxChannelConfig | null> {
  const rows = await sql`
    SELECT inbox_id as "inboxId", account_id as "accountId", channel_type as "channelType",
           config, secrets_encrypted as "secretsEncrypted",
           health_status as "healthStatus", last_health_at as "lastHealthAt",
           token_expires_at as "tokenExpiresAt",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM inbox_channel_configs
    WHERE inbox_id = ${inboxId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as ConfigRow | undefined;
  return row ? serialize(row) : null;
}

export async function upsertChannelConfig(
  sql: AppSql,
  accountId: string,
  inboxId: string,
  input: ChannelConfigInput
): Promise<InboxChannelConfig & { signingSecret?: string }> {
  const inbox = await sql`
    SELECT id FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!inbox[0]) throw new Error('Inbox not found');

  const existing = await sql`
    SELECT secrets_encrypted as "secretsEncrypted"
    FROM inbox_channel_configs
    WHERE inbox_id = ${inboxId}::uuid
    LIMIT 1
  `;
  const hadSecret = Boolean(
    (existing[0] as { secretsEncrypted: string | null } | undefined)?.secretsEncrypted
  );

  let signingSecret: string | undefined;
  let secretsToStore = input.secretsEncrypted ?? null;
  if (secretsToStore) {
    signingSecret = secretsToStore;
  } else if (!hadSecret) {
    signingSecret = randomBytes(32).toString('hex');
    secretsToStore = signingSecret;
  }

  const configJson = JSON.stringify(input.config ?? {});
  const rows = await sql`
    INSERT INTO inbox_channel_configs (
      inbox_id, account_id, channel_type, config, secrets_encrypted,
      health_status, token_expires_at
    )
    VALUES (
      ${inboxId}::uuid, ${accountId}::uuid, ${input.channelType},
      ${configJson}::jsonb, ${secretsToStore},
      ${input.healthStatus ?? 'unknown'},
      ${input.tokenExpiresAt ?? null}::timestamptz
    )
    ON CONFLICT (inbox_id) DO UPDATE SET
      channel_type = ${input.channelType},
      config = COALESCE(${configJson}::jsonb, inbox_channel_configs.config),
      secrets_encrypted = COALESCE(${secretsToStore}, inbox_channel_configs.secrets_encrypted),
      health_status = COALESCE(${input.healthStatus ?? null}, inbox_channel_configs.health_status),
      token_expires_at = COALESCE(${input.tokenExpiresAt ?? null}::timestamptz, inbox_channel_configs.token_expires_at),
      updated_at = NOW()
    RETURNING inbox_id as "inboxId", account_id as "accountId", channel_type as "channelType",
              config, secrets_encrypted as "secretsEncrypted",
              health_status as "healthStatus", last_health_at as "lastHealthAt",
              token_expires_at as "tokenExpiresAt",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return {
    ...serialize(rows[0] as ConfigRow),
    ...(signingSecret ? { signingSecret } : {}),
  };
}

export function verifyApiChannelSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.replace(/^sha256=/i, '');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type GenericInboundPayload = {
  externalId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  content: string;
  providerMessageId?: string | null;
};

export async function ingestGenericChannelMessage(
  sql: AppSql,
  accountId: string,
  inboxId: string,
  payload: GenericInboundPayload
): Promise<{ conversationId: string; messageId: string; deduped: boolean }> {
  if (payload.providerMessageId) {
    const existing = await sql`
      SELECT id, conversation_id as "conversationId"
      FROM messages
      WHERE account_id = ${accountId}::uuid AND channel_provider_id = ${payload.providerMessageId}
      LIMIT 1
    `;
    const hit = existing[0] as { id: string; conversationId: string } | undefined;
    if (hit) {
      return { conversationId: hit.conversationId, messageId: hit.id, deduped: true };
    }
  }

  let contactId: string | null = null;
  if (payload.externalId) {
    const rows = await sql`
      SELECT id FROM contacts
      WHERE account_id = ${accountId}::uuid AND external_id = ${payload.externalId}
      LIMIT 1
    `;
    contactId = (rows[0] as { id: string } | undefined)?.id ?? null;
  }
  if (!contactId && payload.contactEmail) {
    const email = payload.contactEmail.trim().toLowerCase();
    const rows = await sql`
      SELECT id FROM contacts
      WHERE account_id = ${accountId}::uuid AND LOWER(email) = ${email}
      LIMIT 1
    `;
    contactId = (rows[0] as { id: string } | undefined)?.id ?? null;
  }
  if (!contactId) {
    const created = await sql`
      INSERT INTO contacts (account_id, name, email, phone, external_id, type, last_activity_at)
      VALUES (
        ${accountId}::uuid,
        ${payload.contactName?.trim() || payload.contactEmail || payload.contactPhone || 'API contact'},
        ${payload.contactEmail?.trim().toLowerCase() ?? null},
        ${payload.contactPhone ?? null},
        ${payload.externalId ?? null},
        'lead',
        NOW()
      )
      RETURNING id
    `;
    contactId = (created[0] as { id: string }).id;
  }

  let convRows = await sql`
    SELECT id FROM conversations
    WHERE account_id = ${accountId}::uuid
      AND inbox_id = ${inboxId}::uuid
      AND contact_id = ${contactId}::uuid
      AND status != 'resolved'
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  let conversationId = (convRows[0] as { id: string } | undefined)?.id;
  let isNewConversation = false;
  if (!conversationId) {
    const created = await sql`
      INSERT INTO conversations (account_id, inbox_id, contact_id, status, priority)
      VALUES (${accountId}::uuid, ${inboxId}::uuid, ${contactId}::uuid, 'open', 'medium')
      RETURNING id
    `;
    conversationId = (created[0] as { id: string }).id;
    isNewConversation = true;
  }

  const msgs = await sql`
    INSERT INTO messages (
      conversation_id, account_id, content, sender_type, sender_id,
      channel_provider_id, delivery_status
    )
    VALUES (
      ${conversationId}::uuid, ${accountId}::uuid, ${payload.content},
      'contact', ${contactId}::uuid, ${payload.providerMessageId ?? null}, 'received'
    )
    RETURNING id
  `;

  await sql`
    UPDATE conversations SET
      last_activity_at = NOW(), updated_at = NOW(),
      unread_count = unread_count + 1
    WHERE id = ${conversationId}::uuid
  `;

  if (isNewConversation) {
    void emitPlatformEvent(sql, accountId, 'conversation.created', {
      conversationId,
      inboxId,
      contactId,
    });
  }
  void emitPlatformEvent(sql, accountId, 'message.created', {
    conversationId,
    inboxId,
    contactId,
    senderType: 'contact',
  });

  return {
    conversationId,
    messageId: (msgs[0] as { id: string }).id,
    deduped: false,
  };
}
