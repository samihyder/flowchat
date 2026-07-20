import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import {
  childAppHandoffUrl,
  signEcosystemToken,
  type EcosystemApp,
} from '@/lib/ecosystem-sso';

const VALID_TARGETS: EcosystemApp[] = ['wa-automation', 'lead-monitor'];

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const target = url.searchParams.get('target') as EcosystemApp | null;
  const accountId = url.searchParams.get('accountId');

  if (!target || !VALID_TARGETS.includes(target)) {
    return Response.json({ error: 'target must be wa-automation or lead-monitor' }, { status: 400 });
  }
  if (!accountId) {
    return Response.json({ error: 'accountId required' }, { status: 400 });
  }

  const secret = process.env.MUTEX_ECOSYSTEM_SSO_SECRET;
  if (!secret) {
    return Response.json({ error: 'SSO not configured' }, { status: 503 });
  }

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const userRows = await sql`
    SELECT email FROM users WHERE id = ${auth.userId}::uuid LIMIT 1
  `;
  const email = (userRows[0] as { email: string } | undefined)?.email;
  if (!email) return Response.json({ error: 'User not found' }, { status: 404 });

  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    `${url.protocol}//${url.host}`;

  const ssoToken = signEcosystemToken(
    {
      email,
      flowchatAccountId: accountId,
      flowchatUserId: auth.userId,
      target,
      ttlSeconds: 300,
    },
    secret
  );

  return Response.json({
    url: childAppHandoffUrl(siteOrigin, target, ssoToken),
    expiresIn: 300,
  });
}
