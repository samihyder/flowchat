import type { EmailProviderAdapter } from '@/lib/credentials/providers/email/types';

export const resendEmailProvider: EmailProviderAdapter = {
  id: 'resend',

  async verify({ apiKey }) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid Resend API key' };
      }
      if (!res.ok) return { ok: false, error: `Resend API error (${res.status})` };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach Resend API' };
    }
  },

  async send({ apiKey }, payload) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
        headers: payload.headers,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message ?? `Resend send failed (${res.status})` };
    }
    if (!data.id) return { ok: false, error: 'Resend did not return a message id' };
    return { ok: true, messageId: data.id, provider: 'resend' };
  },

  async checkDomain({ apiKey }, fromEmail) {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    if (!domain) return 'unknown';
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return 'unknown';
      const data = (await res.json()) as { data?: { name: string; status: string }[] };
      const match = data.data?.find((d) => d.name === domain || domain.endsWith(`.${d.name}`));
      if (!match) return 'unknown';
      if (match.status === 'verified') return 'verified';
      if (match.status === 'failed' || match.status === 'not_started') return 'failed';
      return 'pending';
    } catch {
      return 'unknown';
    }
  },
};
