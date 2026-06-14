import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { isDomainAllowed, parseAllowedDomains } from '@/lib/domain-allowlist';
import { parseAccountSettings } from '@/lib/account-settings';
import {
  DEFAULT_OFFLINE_MESSAGE,
  countOnlineAgents,
  resolveInboxAvailability,
} from '@/lib/inbox-availability';
import {
  resolveGreetingMessages,
  resolveWelcomeTagline,
  resolveWelcomeTitle,
} from '@/lib/welcome-messages';

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
           i.offline_message as "offlineMessage",
           i.greeting_messages as "greetingMessages",
           i.greeting_message as "greetingMessage",
           i.welcome_title as "welcomeTitle",
           i.welcome_tagline as "welcomeTagline",
           i.require_consent as "requireConsent",
           i.privacy_policy_url as "privacyPolicyUrl",
           a.timezone, a.settings as "accountSettings", a.id as "accountId"
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
    greetingMessages: unknown;
    greetingMessage: string | null;
    welcomeTitle: string | null;
    welcomeTagline: string | null;
    requireConsent: boolean;
    privacyPolicyUrl: string | null;
    timezone: string;
    accountSettings: unknown;
    accountId: string;
  } | undefined;

  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
  }

  const allowed = isDomainAllowed(parseAllowedDomains(inbox.allowedDomains), origin);
  if (!allowed) {
    return Response.json({ error: 'Domain not authorized' }, { status: 403, headers: corsHeaders() });
  }

  const onlineCount = await countOnlineAgents(sql, inbox.accountId);
  const availability = resolveInboxAvailability(
    {
      useBusinessHours: inbox.useBusinessHours,
      businessHours: inbox.businessHours,
      timezone: inbox.timezone,
    },
    onlineCount
  );

  const accountSettings = parseAccountSettings(inbox.accountSettings);
  const greetingMessages = resolveGreetingMessages(
    inbox.greetingMessages,
    inbox.greetingMessage,
    accountSettings
  );

  return Response.json(
    {
      available: availability.available,
      withinBusinessHours: availability.withinBusinessHours,
      agentsOnline: availability.agentsOnline,
      offlineMessage: inbox.offlineMessage ?? DEFAULT_OFFLINE_MESSAGE,
      greetingMessages,
      welcomeTitle: resolveWelcomeTitle(inbox.welcomeTitle, accountSettings),
      welcomeTagline: resolveWelcomeTagline(
        inbox.welcomeTagline,
        accountSettings,
        !availability.available
      ),
      requireConsent: inbox.requireConsent,
      privacyPolicyUrl: inbox.privacyPolicyUrl,
    },
    { headers: corsHeaders() }
  );
}
