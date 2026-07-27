import type { AppSql } from '@/lib/db-sql';
import { parseAccountSettings } from '@/lib/account-settings';
import { chatAnthropic } from '@/lib/credentials/providers/ai/anthropic';
import { getCredentialSecret, markCredentialUsed } from '@/lib/credentials/store';

async function resolveAnthropicCredential(sql: AppSql, accountId: string) {
  const acc = await sql`
    SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1
  `;
  const settings = parseAccountSettings((acc[0] as { settings?: unknown } | undefined)?.settings);
  let credentialId = settings.aiCredentialId;

  if (!credentialId) {
    const defaults = await sql`
      SELECT id FROM account_service_credentials
      WHERE account_id = ${accountId}::uuid AND category = 'ai_chat' AND status = 'active'
      ORDER BY is_default DESC LIMIT 1
    `;
    credentialId = (defaults[0] as { id: string } | undefined)?.id;
  }
  if (!credentialId) return null;

  const cred = await getCredentialSecret(sql, accountId, credentialId);
  if (!cred || cred.row.provider !== 'anthropic') return null;
  return cred;
}

async function loadRecentMessages(sql: AppSql, accountId: string, conversationId: string) {
  const rows = await sql`
    SELECT content, sender_type as "senderType"
    FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND account_id = ${accountId}::uuid
      AND deleted_at IS NULL
      AND is_private = false
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return (rows as { content: string; senderType: string }[]).reverse();
}

const STUB_SUGGESTIONS = [
  'Thanks for reaching out — happy to help. Could you share a bit more detail?',
  'Got it. I’ll look into this and get back to you shortly.',
  'Appreciate your patience. Here’s what I recommend we do next…',
];

export async function suggestReplies(
  sql: AppSql,
  accountId: string,
  conversationId: string
): Promise<{ suggestions: string[]; source: 'ai' | 'stub' }> {
  const messages = await loadRecentMessages(sql, accountId, conversationId);
  const cred = await resolveAnthropicCredential(sql, accountId);

  if (!cred || messages.length === 0) {
    return { suggestions: STUB_SUGGESTIONS, source: 'stub' };
  }

  const transcript = messages
    .map((m) => `${m.senderType === 'contact' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  const result = await chatAnthropic(cred.secret, {
    system:
      'You are a support agent copilot. Suggest exactly 3 short, professional reply options. Return each on its own line, no numbering or bullets.',
    messages: [
      {
        role: 'user',
        content: `Conversation:\n${transcript}\n\nSuggest 3 replies.`,
      },
    ],
    maxTokens: 400,
  });

  if (!result.ok) {
    return { suggestions: STUB_SUGGESTIONS, source: 'stub' };
  }

  await markCredentialUsed(sql, cred.row.id);
  const suggestions = result.text
    .split('\n')
    .map((l) => l.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  while (suggestions.length < 3) {
    suggestions.push(STUB_SUGGESTIONS[suggestions.length]!);
  }

  return { suggestions, source: 'ai' };
}

export async function summarizeConversation(
  sql: AppSql,
  accountId: string,
  conversationId: string
): Promise<{ summary: string; source: 'ai' | 'stub' }> {
  const messages = await loadRecentMessages(sql, accountId, conversationId);
  if (messages.length === 0) {
    return { summary: 'No messages in this conversation yet.', source: 'stub' };
  }

  const cred = await resolveAnthropicCredential(sql, accountId);
  const transcript = messages
    .map((m) => `${m.senderType === 'contact' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  if (!cred) {
    const preview = messages
      .slice(-3)
      .map((m) => m.content.slice(0, 80))
      .join(' · ');
    return { summary: `Recent: ${preview}`, source: 'stub' };
  }

  const result = await chatAnthropic(cred.secret, {
    system: 'Summarize this support conversation in 2–3 concise sentences.',
    messages: [{ role: 'user', content: transcript }],
    maxTokens: 300,
  });

  if (!result.ok) {
    return { summary: 'Unable to summarize right now.', source: 'stub' };
  }
  await markCredentialUsed(sql, cred.row.id);
  return { summary: result.text.trim(), source: 'ai' };
}

export async function rewriteText(
  sql: AppSql,
  accountId: string,
  text: string,
  tone?: string
): Promise<{ text: string; source: 'ai' | 'stub' }> {
  const trimmed = text.trim();
  if (!trimmed) return { text: '', source: 'stub' };

  const cred = await resolveAnthropicCredential(sql, accountId);
  if (!cred) {
    return { text: trimmed, source: 'stub' };
  }

  const result = await chatAnthropic(cred.secret, {
    system: `Rewrite the agent reply to be clearer and more ${tone || 'professional'}. Return only the rewritten text.`,
    messages: [{ role: 'user', content: trimmed }],
    maxTokens: 500,
  });

  if (!result.ok) return { text: trimmed, source: 'stub' };
  await markCredentialUsed(sql, cred.row.id);
  return { text: result.text.trim(), source: 'ai' };
}
