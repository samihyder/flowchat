import type { VerifyResult } from '@/lib/credentials/types';

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AnthropicChatResult =
  | { ok: true; text: string; model: string; inputTokens?: number; outputTokens?: number }
  | { ok: false; error: string };

export async function verifyAnthropicKey(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid Anthropic API key' };
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false, error: data.error?.message ?? `Anthropic API error (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach Anthropic API' };
  }
}

export async function chatAnthropic(
  apiKey: string,
  opts: {
    model?: string;
    system?: string;
    messages: AnthropicMessage[];
    maxTokens?: number;
  }
): Promise<AnthropicChatResult> {
  const model = opts.model ?? 'claude-3-5-haiku-20241022';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        messages: opts.messages,
      }),
    });
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `Anthropic error (${res.status})` };
    }
    const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
    return {
      ok: true,
      text,
      model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Anthropic request failed' };
  }
}
