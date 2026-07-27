import { randomBytes } from 'node:crypto';
import type { AppSql } from '@/lib/db-sql';
import { getCredentialSecret, markCredentialUsed } from '@/lib/credentials/store';
import { stopRecipientForReply } from '@/lib/marketing/s6m-campaign-dispatch';
import { emitPlatformEvent } from '@/lib/platform-events';

export type EmailInboxConfig = {
  inboxId: string;
  accountId: string;
  forwardingAddress: string | null;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapTls: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  useResendOutbound: boolean;
  credentialId: string | null;
  lastPolledAt: string | null;
  pollCursor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailInboxConfigInput = {
  forwardingAddress?: string | null;
  imapHost?: string | null;
  imapPort?: number | null;
  imapUser?: string | null;
  imapPasswordEncrypted?: string | null;
  imapTls?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPasswordEncrypted?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  useResendOutbound?: boolean;
  credentialId?: string | null;
};

export type InboundEmailPayload = {
  fromEmail: string;
  fromName?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
};

type ConfigRow = {
  inboxId: string;
  accountId: string;
  forwardingAddress: string | null;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapTls: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  useResendOutbound: boolean;
  credentialId: string | null;
  lastPolledAt: Date | string | null;
  pollCursor: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serializeConfig(row: ConfigRow): EmailInboxConfig {
  return {
    inboxId: row.inboxId,
    accountId: row.accountId,
    forwardingAddress: row.forwardingAddress,
    imapHost: row.imapHost,
    imapPort: row.imapPort,
    imapUser: row.imapUser,
    imapTls: row.imapTls,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpFromEmail: row.smtpFromEmail,
    smtpFromName: row.smtpFromName,
    useResendOutbound: row.useResendOutbound,
    credentialId: row.credentialId,
    lastPolledAt: row.lastPolledAt ? new Date(row.lastPolledAt).toISOString() : null,
    pollCursor: row.pollCursor,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function getEmailInboxConfig(
  sql: AppSql,
  accountId: string,
  inboxId: string
): Promise<EmailInboxConfig | null> {
  const rows = await sql`
    SELECT inbox_id as "inboxId", account_id as "accountId",
           forwarding_address as "forwardingAddress",
           imap_host as "imapHost", imap_port as "imapPort", imap_user as "imapUser",
           imap_tls as "imapTls",
           smtp_host as "smtpHost", smtp_port as "smtpPort", smtp_user as "smtpUser",
           smtp_from_email as "smtpFromEmail", smtp_from_name as "smtpFromName",
           use_resend_outbound as "useResendOutbound", credential_id as "credentialId",
           last_polled_at as "lastPolledAt", poll_cursor as "pollCursor",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM inbox_email_configs
    WHERE inbox_id = ${inboxId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as ConfigRow | undefined;
  return row ? serializeConfig(row) : null;
}

export async function upsertEmailInboxConfig(
  sql: AppSql,
  accountId: string,
  inboxId: string,
  input: EmailInboxConfigInput
): Promise<EmailInboxConfig> {
  const inbox = await sql`
    SELECT id FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!inbox[0]) throw new Error('Inbox not found');

  const rows = await sql`
    INSERT INTO inbox_email_configs (
      inbox_id, account_id, forwarding_address,
      imap_host, imap_port, imap_user, imap_password_encrypted, imap_tls,
      smtp_host, smtp_port, smtp_user, smtp_password_encrypted,
      smtp_from_email, smtp_from_name, use_resend_outbound, credential_id
    )
    VALUES (
      ${inboxId}::uuid, ${accountId}::uuid, ${input.forwardingAddress ?? null},
      ${input.imapHost ?? null}, ${input.imapPort ?? 993}, ${input.imapUser ?? null},
      ${input.imapPasswordEncrypted ?? null}, ${input.imapTls ?? true},
      ${input.smtpHost ?? null}, ${input.smtpPort ?? 587}, ${input.smtpUser ?? null},
      ${input.smtpPasswordEncrypted ?? null},
      ${input.smtpFromEmail ?? null}, ${input.smtpFromName ?? null},
      ${input.useResendOutbound ?? true}, ${input.credentialId ?? null}::uuid
    )
    ON CONFLICT (inbox_id) DO UPDATE SET
      forwarding_address = ${input.forwardingAddress ?? null},
      imap_host = ${input.imapHost ?? null},
      imap_port = ${input.imapPort ?? 993},
      imap_user = ${input.imapUser ?? null},
      imap_password_encrypted = COALESCE(${input.imapPasswordEncrypted ?? null}, inbox_email_configs.imap_password_encrypted),
      imap_tls = ${input.imapTls ?? true},
      smtp_host = ${input.smtpHost ?? null},
      smtp_port = ${input.smtpPort ?? 587},
      smtp_user = ${input.smtpUser ?? null},
      smtp_password_encrypted = COALESCE(${input.smtpPasswordEncrypted ?? null}, inbox_email_configs.smtp_password_encrypted),
      smtp_from_email = ${input.smtpFromEmail ?? null},
      smtp_from_name = ${input.smtpFromName ?? null},
      use_resend_outbound = ${input.useResendOutbound ?? true},
      credential_id = ${input.credentialId ?? null}::uuid,
      updated_at = NOW()
    RETURNING inbox_id as "inboxId", account_id as "accountId",
              forwarding_address as "forwardingAddress",
              imap_host as "imapHost", imap_port as "imapPort", imap_user as "imapUser",
              imap_tls as "imapTls",
              smtp_host as "smtpHost", smtp_port as "smtpPort", smtp_user as "smtpUser",
              smtp_from_email as "smtpFromEmail", smtp_from_name as "smtpFromName",
              use_resend_outbound as "useResendOutbound", credential_id as "credentialId",
              last_polled_at as "lastPolledAt", poll_cursor as "pollCursor",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serializeConfig(rows[0] as ConfigRow);
}

function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().replace(/^<|>$/g, '');
}

function generateMessageId(domain = 'flowchat.local'): string {
  return `${randomBytes(16).toString('hex')}@${domain}`;
}

async function maybeStopCampaignOnReply(
  sql: AppSql,
  accountId: string,
  inReplyTo: string | null
) {
  if (!inReplyTo) return;
  const mid = normalizeMessageId(inReplyTo);
  if (!mid) return;

  const step = await sql`
    SELECT rs.recipient_id as "recipientId", rs.campaign_id as "campaignId"
    FROM marketing_campaign_recipient_steps rs
    INNER JOIN marketing_campaigns c ON c.id = rs.campaign_id
    WHERE c.account_id = ${accountId}::uuid
      AND (rs.provider_message_id = ${mid} OR rs.provider_message_id = ${`<${mid}>`})
    LIMIT 1
  `;
  const row = step[0] as { recipientId: string; campaignId: string } | undefined;
  if (!row) return;
  await stopRecipientForReply(sql, row.recipientId, row.campaignId, mid);
}

export async function ingestInboundEmail(
  sql: AppSql,
  accountId: string,
  inboxId: string,
  payload: InboundEmailPayload
): Promise<{ conversationId: string; messageId: string; deduped: boolean }> {
  const emailMessageId = normalizeMessageId(payload.messageId);
  if (emailMessageId) {
    const existing = await sql`
      SELECT id, conversation_id as "conversationId"
      FROM messages
      WHERE account_id = ${accountId}::uuid AND email_message_id = ${emailMessageId}
      LIMIT 1
    `;
    const hit = existing[0] as { id: string; conversationId: string } | undefined;
    if (hit) {
      return { conversationId: hit.conversationId, messageId: hit.id, deduped: true };
    }
  }

  const inReplyTo = normalizeMessageId(payload.inReplyTo);
  let conversationId: string | null = null;

  if (inReplyTo) {
    const parent = await sql`
      SELECT conversation_id as "conversationId"
      FROM messages
      WHERE account_id = ${accountId}::uuid
        AND (email_message_id = ${inReplyTo} OR email_message_id = ${`<${inReplyTo}>`})
      LIMIT 1
    `;
    conversationId = (parent[0] as { conversationId: string } | undefined)?.conversationId ?? null;
  }

  const fromEmail = payload.fromEmail.trim().toLowerCase();
  if (!fromEmail) throw new Error('fromEmail required');

  let contactId: string | null = null;
  if (conversationId) {
    const conv = await sql`
      SELECT contact_id as "contactId" FROM conversations
      WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
    `;
    contactId = (conv[0] as { contactId: string } | undefined)?.contactId ?? null;
  }

  if (!contactId) {
    const contacts = await sql`
      SELECT id FROM contacts
      WHERE account_id = ${accountId}::uuid AND LOWER(email) = ${fromEmail}
      LIMIT 1
    `;
    contactId = (contacts[0] as { id: string } | undefined)?.id ?? null;
    if (!contactId) {
      const created = await sql`
        INSERT INTO contacts (account_id, name, email, type, last_activity_at)
        VALUES (
          ${accountId}::uuid,
          ${payload.fromName?.trim() || fromEmail},
          ${fromEmail},
          'lead',
          NOW()
        )
        RETURNING id
      `;
      contactId = (created[0] as { id: string }).id;
    }
  }

  let isNewConversation = false;
  if (!conversationId) {
    const open = await sql`
      SELECT id FROM conversations
      WHERE account_id = ${accountId}::uuid
        AND inbox_id = ${inboxId}::uuid
        AND contact_id = ${contactId}::uuid
        AND status != 'resolved'
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    conversationId = (open[0] as { id: string } | undefined)?.id ?? null;
    if (!conversationId) {
      const created = await sql`
        INSERT INTO conversations (account_id, inbox_id, contact_id, status, priority)
        VALUES (${accountId}::uuid, ${inboxId}::uuid, ${contactId}::uuid, 'open', 'medium')
        RETURNING id
      `;
      conversationId = (created[0] as { id: string }).id;
      isNewConversation = true;
    }
  }

  const content =
    payload.textBody?.trim() ||
    payload.htmlBody?.replace(/<[^>]+>/g, ' ').trim() ||
    '(empty email)';

  const msgs = await sql`
    INSERT INTO messages (
      conversation_id, account_id, content, sender_type, sender_id,
      email_message_id, email_in_reply_to, email_references, email_subject,
      delivery_status
    )
    VALUES (
      ${conversationId}::uuid, ${accountId}::uuid, ${content}, 'contact', ${contactId}::uuid,
      ${emailMessageId}, ${inReplyTo}, ${payload.references ?? null}, ${payload.subject ?? null},
      'received'
    )
    RETURNING id
  `;
  const messageId = (msgs[0] as { id: string }).id;

  await sql`
    UPDATE conversations SET
      last_activity_at = NOW(),
      updated_at = NOW(),
      unread_count = unread_count + 1,
      status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END
    WHERE id = ${conversationId}::uuid
  `;

  await maybeStopCampaignOnReply(sql, accountId, inReplyTo);

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
    messageId,
    senderType: 'contact',
  });

  return { conversationId, messageId, deduped: false };
}

export async function sendEmailReply(
  sql: AppSql,
  accountId: string,
  conversationId: string,
  userId: string,
  opts: { content: string; subject?: string }
): Promise<{ messageId: string; emailMessageId: string; deliveryStatus: string }> {
  const conv = await sql`
    SELECT c.id, c.inbox_id as "inboxId", ct.email as "contactEmail", ct.name as "contactName"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = ${conversationId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = conv[0] as
    | { id: string; inboxId: string; contactEmail: string | null; contactName: string | null }
    | undefined;
  if (!row) throw new Error('Conversation not found');
  if (!row.contactEmail) throw new Error('Contact has no email');

  const config = await getEmailInboxConfig(sql, accountId, row.inboxId);
  const lastInbound = await sql`
    SELECT email_message_id as "emailMessageId", email_subject as "emailSubject"
    FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND sender_type = 'contact'
      AND email_message_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const parent = lastInbound[0] as
    | { emailMessageId: string | null; emailSubject: string | null }
    | undefined;

  const domain =
    config?.smtpFromEmail?.split('@')[1] ||
    config?.forwardingAddress?.split('@')[1] ||
    'flowchat.local';
  const emailMessageId = generateMessageId(domain);
  const subject =
    opts.subject?.trim() ||
    (parent?.emailSubject
      ? parent.emailSubject.startsWith('Re:')
        ? parent.emailSubject
        : `Re: ${parent.emailSubject}`
      : 'Re: your message');

  let deliveryStatus = 'sent_local';
  let providerId: string | null = null;

  if (config?.useResendOutbound && config.credentialId) {
    const cred = await getCredentialSecret(sql, accountId, config.credentialId);
    if (cred?.secret) {
      const from =
        config.smtpFromName && config.smtpFromEmail
          ? `${config.smtpFromName} <${config.smtpFromEmail}>`
          : config.smtpFromEmail || 'noreply@flowchat.local';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cred.secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [row.contactEmail],
          subject,
          text: opts.content,
          headers: {
            'Message-ID': `<${emailMessageId}>`,
            ...(parent?.emailMessageId
              ? { 'In-Reply-To': `<${normalizeMessageId(parent.emailMessageId)}>` }
              : {}),
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok && data.id) {
        deliveryStatus = 'sent';
        providerId = data.id;
        await markCredentialUsed(sql, cred.row.id);
      } else {
        deliveryStatus = 'failed';
      }
    }
  }

  const msgs = await sql`
    INSERT INTO messages (
      conversation_id, account_id, content, sender_type, sender_id,
      email_message_id, email_in_reply_to, email_subject,
      channel_provider_id, delivery_status
    )
    VALUES (
      ${conversationId}::uuid, ${accountId}::uuid, ${opts.content}, 'agent', ${userId}::uuid,
      ${emailMessageId}, ${parent?.emailMessageId ?? null}, ${subject},
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
    emailMessageId,
    deliveryStatus,
  };
}

/** Stub: mark IMAP poll time; real IMAP fetch lands in a later sprint. */
export async function pollEmailInboxesStub(sql: AppSql): Promise<number> {
  const result = await sql`
    UPDATE inbox_email_configs
    SET last_polled_at = NOW(), updated_at = NOW()
    WHERE imap_host IS NOT NULL
    RETURNING inbox_id
  `;
  return result.length;
}
