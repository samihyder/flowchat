import type { EmailProviderAdapter } from '@/lib/credentials/providers/email/types';

export const sendgridEmailProvider: EmailProviderAdapter = {
  id: 'sendgrid',

  async verify({ apiKey }) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid SendGrid API key' };
      }
      if (!res.ok) return { ok: false, error: `SendGrid API error (${res.status})` };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach SendGrid API' };
    }
  },

  async send({ apiKey }, payload) {
    const fromMatch = payload.from.match(/^(.+?)\s*<([^>]+)>$/);
    const fromEmail = fromMatch?.[2] ?? payload.from;
    const fromName = fromMatch?.[1]?.trim();

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }], subject: payload.subject }],
        from: { email: fromEmail, ...(fromName ? { name: fromName } : {}) },
        reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
        content: [
          { type: 'text/plain', value: payload.text },
          { type: 'text/html', value: payload.html },
        ],
        headers: payload.headers,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: errText || `SendGrid send failed (${res.status})` };
    }

    const messageId = res.headers.get('x-message-id') ?? `sg-${Date.now()}`;
    return { ok: true, messageId, provider: 'sendgrid' };
  },
};
