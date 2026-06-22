import type { EmailProviderAdapter } from '@/lib/credentials/providers/email/types';

/** Resend returns this when a send-only key hits a non-send endpoint (e.g. GET /domains). */
function isResendSendOnlyRestriction(message?: string, status?: number): boolean {
  const m = (message ?? '').toLowerCase();
  if (m.includes('restricted') && m.includes('send')) return true;
  if (m.includes('only send email')) return true;
  if (status === 403 && m.includes('api key')) return true;
  return false;
}

export const resendEmailProvider: EmailProviderAdapter = {
  id: 'resend',

  async verify({ apiKey }) {
    try {
      // Send-only keys can POST /emails but cannot GET /domains — verify via the send endpoint.
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; statusCode?: number };

      if (res.status === 401) {
        return {
          ok: false,
          error: data.message ?? 'Invalid Resend API key — check the key starts with re_',
        };
      }

      // Empty body → validation error, but the key authenticated successfully.
      if (res.status === 422 || res.status === 400) {
        return { ok: true };
      }

      if (res.ok) {
        return { ok: true };
      }

      if (isResendSendOnlyRestriction(data.message, res.status)) {
        return { ok: true };
      }

      // Fallback: domains probe for older full-access keys if send probe is inconclusive
      const domainRes = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const domainData = (await domainRes.json().catch(() => ({}))) as { message?: string };
      if (domainRes.ok || isResendSendOnlyRestriction(domainData.message, domainRes.status)) {
        return { ok: true };
      }
      if (domainRes.status === 401) {
        return {
          ok: false,
          error: domainData.message ?? 'Invalid Resend API key',
        };
      }

      return {
        ok: false,
        error: data.message ?? domainData.message ?? `Resend API error (${res.status})`,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Could not reach Resend API',
      };
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
