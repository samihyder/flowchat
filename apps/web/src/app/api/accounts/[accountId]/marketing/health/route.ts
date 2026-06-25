import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import type { AppSql } from '@/lib/db-sql';
import { resolveEmailCredential } from '@/lib/credentials/store';
import { getMarketingCronState, isCronHealthy } from '@/lib/marketing/marketing-cron-state';
import { checkSenderDomainStatus } from '@/lib/marketing/senders';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const settings = await getAccountSettings(sql, accountId);
  const cronState = await getMarketingCronState(sql).catch(() => ({
    lastRunAt: null,
    lastProcessed: 0,
    lastError: null,
  }));

  const cred = await resolveEmailCredential(sql, accountId, null);
  const providerOk = cred ? cred.row.status === 'active' : Boolean(process.env.RESEND_API_KEY);
  const providerLabel = cred
    ? `${cred.row.provider} (${cred.row.label})`
    : process.env.RESEND_API_KEY
      ? 'Platform Resend'
      : 'Not connected';

  const fromEmail = settings.marketingFromEmail ?? '';
  let domainStatus = 'unknown';
  if (fromEmail) {
    domainStatus = await checkSenderDomainStatus(sql, accountId, fromEmail, cred?.row.id ?? null);
  }

  const cronOk =
    isCronHealthy(cronState) ||
    process.env.NODE_ENV === 'development' ||
    Boolean(process.env.VERCEL);

  const origin =
    process.env.NEXT_PUBLIC_WEB_APP_URL ??
    process.env.WEB_APP_URL ??
    'https://app.flowchat.io';
  const webhookHint = cred
    ? `${origin}/api/webhooks/email/${cred.row.id}`
    : `${origin}/api/webhooks/resend`;

  return Response.json({
    providerOk,
    providerLabel,
    domainStatus,
    domainOk: domainStatus === 'verified' || (!cred && Boolean(process.env.RESEND_API_KEY)),
    cronOk,
    cronLastAt: cronState.lastRunAt,
    cronLastProcessed: cronState.lastProcessed,
    cronError: cronState.lastError,
    webhookUrl: webhookHint,
    fromEmail,
  });
}
