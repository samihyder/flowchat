import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { isDomainAllowed, parseAllowedDomains } from '@/lib/domain-allowlist';
import { isWithinBusinessHours, parseBusinessHours } from '@/lib/business-hours';

type Params = { params: Promise<{ inboxId: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503, headers: corsHeaders() });
  }

  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  const sql = neon(databaseUrl);

  const rows = await sql`
    SELECT i.allowed_domains as "allowedDomains", i.business_hours as "businessHours",
           i.use_business_hours as "useBusinessHours",
           i.offline_message as "offlineMessage", i.require_consent as "requireConsent",
           i.privacy_policy_url as "privacyPolicyUrl",
           a.timezone
    FROM inboxes i
    INNER JOIN accounts a ON a.id = i.account_id
    WHERE i.id = ${inboxId}::uuid AND i.is_enabled = true
    LIMIT 1
  `;

  const inbox = rows[0] as {
    allowedDomains: unknown;
    businessHours: unknown;
    useBusinessHours: boolean;
    offlineMessage: string | null;
    requireConsent: boolean;
    privacyPolicyUrl: string | null;
    timezone: string;
  } | undefined;

  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
  }

  const allowed = isDomainAllowed(parseAllowedDomains(inbox.allowedDomains), origin);
  if (!allowed) {
    return Response.json({ error: 'Domain not authorized' }, { status: 403, headers: corsHeaders() });
  }

  const hours = parseBusinessHours(inbox.businessHours, inbox.timezone);
  const withinHours = inbox.useBusinessHours
    ? isWithinBusinessHours(hours, inbox.timezone)
    : true;

  const agentsOnline = await sql`
    SELECT COUNT(*)::int as count FROM account_users au
    INNER JOIN inboxes i ON i.account_id = au.account_id
    WHERE i.id = ${inboxId}::uuid
      AND au.status = 'active'
      AND au.availability = 'online'
  `;

  const hasOnlineAgent = ((agentsOnline[0] as { count: number }).count ?? 0) > 0;
  const available = withinHours && hasOnlineAgent;

  return Response.json(
    {
      available,
      withinBusinessHours: withinHours,
      agentsOnline: hasOnlineAgent,
      offlineMessage:
        inbox.offlineMessage ??
        'We are currently offline. Leave your message and we will get back to you soon.',
      requireConsent: inbox.requireConsent,
      privacyPolicyUrl: inbox.privacyPolicyUrl,
    },
    { headers: corsHeaders() }
  );
}
