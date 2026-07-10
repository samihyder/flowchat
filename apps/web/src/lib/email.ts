/** Send transactional email via Resend when configured. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'FlowChat <onboarding@resend.dev>';
  if (!apiKey) {
    console.error('sendEmail: RESEND_API_KEY not configured, skipping send to', opts.to);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('sendEmail: Resend API rejected send', { to: opts.to, status: res.status, body });
    }
    return res.ok;
  } catch (err) {
    console.error('sendEmail: request failed', { to: opts.to, err });
    return false;
  }
}

export async function sendMissedChatEmail(
  to: string,
  details: {
    contactName: string;
    inboxName: string;
    minutesWaiting: number;
    conversationId: string;
  }
) {
  const origin =
    process.env.WEB_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3100');
  const link = `${origin.replace(/\/$/, '')}/dashboard?conversation=${details.conversationId}`;

  return sendEmail({
    to,
    subject: `Missed chat: ${details.contactName} on ${details.inboxName}`,
    html: `
      <p><strong>${details.contactName}</strong> has been waiting <strong>${details.minutesWaiting} minutes</strong> for a reply on <strong>${details.inboxName}</strong>.</p>
      <p><a href="${link}">Open conversation</a></p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, name: string) {
  return sendEmail({
    to,
    subject: 'Reset your FlowChat password',
    html: `
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your FlowChat password. Click below to choose a new one:</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p style="color:#6b7280;font-size:12px">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function sendAgentInviteEmail(to: string, inviteUrl: string, workspaceName: string) {
  return sendEmail({
    to,
    subject: `You're invited to join ${workspaceName} on FlowChat`,
    html: `
      <p>You have been invited to join <strong>${workspaceName}</strong> as an agent on FlowChat.</p>
      <p><a href="${inviteUrl}">Accept invitation</a></p>
      <p style="color:#6b7280;font-size:12px">This link expires in 7 days.</p>
    `,
  });
}
