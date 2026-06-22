import type { EmailProviderAdapter } from '@/lib/credentials/providers/email/types';

function mailgunDomain(config: Record<string, unknown>): string | null {
  const d = config.domain ?? config.mailgunDomain;
  return typeof d === 'string' && d.trim() ? d.trim() : null;
}

export const mailgunEmailProvider: EmailProviderAdapter = {
  id: 'mailgun',

  async verify({ apiKey, config }) {
    const domain = mailgunDomain(config);
    if (!domain) return { ok: false, error: 'Mailgun sending domain is required in config' };
    try {
      const res = await fetch(`https://api.mailgun.net/v3/domains/${encodeURIComponent(domain)}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid Mailgun API key' };
      }
      if (!res.ok) return { ok: false, error: `Mailgun domain lookup failed (${res.status})` };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach Mailgun API' };
    }
  },

  async send({ apiKey, config }, payload) {
    const domain = mailgunDomain(config);
    if (!domain) return { ok: false, error: 'Mailgun sending domain not configured' };

    const body = new URLSearchParams();
    body.set('from', payload.from);
    body.set('to', payload.to);
    body.set('subject', payload.subject);
    body.set('html', payload.html);
    body.set('text', payload.text);
    if (payload.replyTo) body.set('h:Reply-To', payload.replyTo);
    if (payload.headers) {
      for (const [k, v] of Object.entries(payload.headers)) {
        body.set(`h:${k}`, v);
      }
    }

    const res = await fetch(`https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message ?? `Mailgun send failed (${res.status})` };
    }
    if (!data.id) return { ok: false, error: 'Mailgun did not return a message id' };
    return { ok: true, messageId: data.id, provider: 'mailgun' };
  },
};
