import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isAccountAgent } from '@/lib/inbox-assignee';
import { mergeWidgetTheme } from '@/lib/widget-theme';

type Params = { params: Promise<{ accountId: string; inboxId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const body = (await req.json()) as {
    name?: string;
    greetingMessage?: string | null;
    greetingMessages?: string[];
    welcomeTitle?: string | null;
    welcomeTagline?: string | null;
    widgetColor?: string;
    widgetIcon?: string;
    widgetTheme?: Record<string, string>;
    websiteUrl?: string | null;
    defaultAssigneeId?: string;
    allowedDomains?: string[];
    businessHours?: Record<string, unknown> | null;
    offlineMessage?: string | null;
    privacyPolicyUrl?: string | null;
    requireConsent?: boolean;
    roundRobinEnabled?: boolean;
    useBusinessHours?: boolean;
    missedChatMinutes?: number;
    csatEnabled?: boolean;
    preChatFields?: unknown[];
  };

  const sql = neon(databaseUrl);

  if (body.defaultAssigneeId !== undefined) {
    if (!body.defaultAssigneeId?.trim()) {
      return Response.json({ error: 'Default agent is required' }, { status: 400 });
    }
    const validAgent = await isAccountAgent(sql, accountId, body.defaultAssigneeId.trim());
    if (!validAgent) {
      return Response.json({ error: 'Selected agent is not in this workspace' }, { status: 400 });
    }
  }
  const existing = await sql`
    SELECT widget_color as "widgetColor", widget_theme as "widgetTheme"
    FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Inbox not found' }, { status: 404 });

  const primary = body.widgetColor ?? (existing[0] as { widgetColor: string }).widgetColor ?? '#6366F1';
  const theme = body.widgetTheme
    ? mergeWidgetTheme(body.widgetTheme, primary)
    : (existing[0] as { widgetTheme: Record<string, string> | null }).widgetTheme;

  const greetingMessages =
    body.greetingMessages !== undefined
      ? body.greetingMessages
      : body.greetingMessage !== undefined && body.greetingMessage
        ? body.greetingMessage
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        : undefined;

  const rows = await sql`
    UPDATE inboxes SET
      name = COALESCE(${body.name ?? null}, name),
      greeting_message = COALESCE(${body.greetingMessage !== undefined ? body.greetingMessage : null}, greeting_message),
      greeting_messages = COALESCE(${greetingMessages !== undefined ? JSON.stringify(greetingMessages) : null}::jsonb, greeting_messages),
      welcome_title = COALESCE(${body.welcomeTitle !== undefined ? body.welcomeTitle : null}, welcome_title),
      welcome_tagline = COALESCE(${body.welcomeTagline !== undefined ? body.welcomeTagline : null}, welcome_tagline),
      widget_color = COALESCE(${body.widgetColor ?? null}, widget_color),
      widget_icon = COALESCE(${body.widgetIcon ?? null}, widget_icon),
      widget_theme = COALESCE(${body.widgetTheme ? JSON.stringify(theme) : null}::jsonb, widget_theme),
      website_url = COALESCE(${body.websiteUrl !== undefined ? body.websiteUrl : null}, website_url),
      default_assignee_id = COALESCE(${body.defaultAssigneeId !== undefined ? body.defaultAssigneeId : null}::uuid, default_assignee_id),
      allowed_domains = COALESCE(${body.allowedDomains ? JSON.stringify(body.allowedDomains) : null}::jsonb, allowed_domains),
      business_hours = COALESCE(${body.businessHours !== undefined ? JSON.stringify(body.businessHours) : null}::jsonb, business_hours),
      offline_message = COALESCE(${body.offlineMessage !== undefined ? body.offlineMessage : null}, offline_message),
      privacy_policy_url = COALESCE(${body.privacyPolicyUrl !== undefined ? body.privacyPolicyUrl : null}, privacy_policy_url),
      require_consent = COALESCE(${body.requireConsent ?? null}, require_consent),
      round_robin_enabled = COALESCE(${body.roundRobinEnabled ?? null}, round_robin_enabled),
      use_business_hours = COALESCE(${body.useBusinessHours ?? null}, use_business_hours),
      missed_chat_minutes = COALESCE(${body.missedChatMinutes ?? null}, missed_chat_minutes),
      csat_enabled = COALESCE(${body.csatEnabled ?? null}, csat_enabled),
      pre_chat_fields = COALESCE(${body.preChatFields ? JSON.stringify(body.preChatFields) : null}::jsonb, pre_chat_fields),
      updated_at = NOW()
    WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, channel_type as "channelType", widget_color as "widgetColor",
              widget_icon as "widgetIcon", widget_theme as "widgetTheme",
              greeting_message as "greetingMessage", greeting_messages as "greetingMessages",
              welcome_title as "welcomeTitle",
              welcome_tagline as "welcomeTagline", website_url as "websiteUrl",
              default_assignee_id as "defaultAssigneeId", is_enabled as "isEnabled",
              allowed_domains as "allowedDomains", business_hours as "businessHours",
              offline_message as "offlineMessage", privacy_policy_url as "privacyPolicyUrl",
              require_consent as "requireConsent", round_robin_enabled as "roundRobinEnabled",
              use_business_hours as "useBusinessHours", missed_chat_minutes as "missedChatMinutes",
              csat_enabled as "csatEnabled", pre_chat_fields as "preChatFields"
  `;

  const inbox = rows[0];
  if (!inbox) return Response.json({ error: 'Failed to update inbox' }, { status: 500 });

  return Response.json({ inbox });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  await sql`
    DELETE FROM inboxes
    WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid
  `;

  return Response.json({ message: 'Inbox deleted' });
}
