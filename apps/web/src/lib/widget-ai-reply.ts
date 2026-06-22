import { parseAccountSettings } from '@/lib/account-settings';
import { chatAnthropic } from '@/lib/credentials/providers/ai/anthropic';
import { getCredentialSecret, markCredentialUsed } from '@/lib/credentials/store';
import { insertMessage } from '@/lib/conversations';
import type { AppSql } from '@/lib/db-sql';

const MAX_CONTEXT_MESSAGES = 20;

async function humanAgentHasReplied(sql: AppSql, conversationId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND sender_type = 'agent'
      AND sender_id IS NOT NULL
    LIMIT 1
  `;
  return rows.length > 0;
}

async function loadConversationContext(sql: AppSql, conversationId: string) {
  const rows = await sql`
    SELECT content, sender_type as "senderType"
    FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND is_private = false
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT ${MAX_CONTEXT_MESSAGES}
  `;
  return rows as { content: string; senderType: string }[];
}

async function resolveAiCredential(
  sql: AppSql,
  accountId: string,
  settings: ReturnType<typeof parseAccountSettings>
) {
  let credentialId = settings.aiCredentialId;
  if (!credentialId) {
    const defaults = await sql`
      SELECT id FROM account_service_credentials
      WHERE account_id = ${accountId}::uuid
        AND category = 'ai_chat'
        AND status = 'active'
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `;
    credentialId = (defaults[0] as { id: string } | undefined)?.id;
  }
  if (!credentialId) return null;
  return getCredentialSecret(sql, accountId, credentialId);
}

/** Reply to visitor widget messages with tenant AI when enabled in settings. */
export async function maybeSendWidgetAiReply(
  sql: AppSql,
  conversationId: string,
  accountId: string
) {
  const accountRows = await sql`
    SELECT name, settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1
  `;
  const account = accountRows[0] as { name: string; settings: unknown } | undefined;
  if (!account) return;

  const settings = parseAccountSettings(account.settings);
  if (!settings.widgetAiEnabled) return;

  if (await humanAgentHasReplied(sql, conversationId)) return;

  const cred = await resolveAiCredential(sql, accountId, settings);
  if (!cred || cred.row.provider !== 'anthropic') return;

  const history = await loadConversationContext(sql, conversationId);
  const messages = history
    .filter((m) => m.content.trim())
    .map((m) => ({
      role: (m.senderType === 'contact' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content.trim(),
    }));

  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') return;

  const model =
    settings.aiModel ??
    (typeof cred.row.config.model === 'string' ? cred.row.config.model : undefined);

  const result = await chatAnthropic(cred.secret, {
    model,
    system: `You are a helpful customer support assistant for ${account.name}. Answer visitor questions concisely and professionally. If you cannot help, suggest they wait for a human agent.`,
    messages,
    maxTokens: 512,
  });

  if (!result.ok || !result.text.trim()) return;

  await markCredentialUsed(sql, cred.row.id);

  await insertMessage({
    sql,
    conversationId,
    accountId,
    content: result.text.trim(),
    senderType: 'agent',
    senderId: null,
    incrementUnread: false,
  });
}
