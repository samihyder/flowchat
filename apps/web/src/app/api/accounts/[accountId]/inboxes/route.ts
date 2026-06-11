import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isAccountAgent } from '@/lib/inbox-assignee';
import { mergeWidgetTheme } from '@/lib/widget-theme';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT id, name, channel_type as "channelType", widget_color as "widgetColor",
           widget_icon as "widgetIcon", widget_theme as "widgetTheme",
           greeting_message as "greetingMessage", welcome_title as "welcomeTitle",
           welcome_tagline as "welcomeTagline", website_url as "websiteUrl",
           default_assignee_id as "defaultAssigneeId", is_enabled as "isEnabled",
           allowed_domains as "allowedDomains", business_hours as "businessHours",
           offline_message as "offlineMessage", privacy_policy_url as "privacyPolicyUrl",
           require_consent as "requireConsent", round_robin_enabled as "roundRobinEnabled",
           use_business_hours as "useBusinessHours", missed_chat_minutes as "missedChatMinutes"
    FROM inboxes
    WHERE account_id = ${accountId}::uuid AND is_enabled = true
    ORDER BY created_at ASC
  `;

  return Response.json({ inboxes: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
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
    channelType?: string;
    greetingMessage?: string;
    welcomeTitle?: string;
    welcomeTagline?: string;
    widgetColor?: string;
    widgetIcon?: string;
    widgetTheme?: Record<string, string>;
    websiteUrl?: string;
    defaultAssigneeId?: string;
  };

  if (!body.name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.defaultAssigneeId?.trim()) {
    return Response.json({ error: 'Default agent is required' }, { status: 400 });
  }

  const sql = neon(databaseUrl);
  const validAgent = await isAccountAgent(sql, accountId, body.defaultAssigneeId.trim());
  if (!validAgent) {
    return Response.json({ error: 'Selected agent is not in this workspace' }, { status: 400 });
  }

  const primary = body.widgetColor ?? '#6366F1';
  const theme = mergeWidgetTheme(body.widgetTheme, primary);

  const rows = await sql`
    INSERT INTO inboxes (
      account_id, name, channel_type, greeting_message,
      welcome_title, welcome_tagline, widget_color, widget_icon, widget_theme,
      website_url, default_assignee_id
    )
    VALUES (
      ${accountId}::uuid,
      ${body.name.trim()},
      ${body.channelType ?? 'web_widget'},
      ${body.greetingMessage ?? null},
      ${body.welcomeTitle ?? null},
      ${body.welcomeTagline ?? null},
      ${primary},
      ${body.widgetIcon ?? 'chat'},
      ${JSON.stringify(theme)}::jsonb,
      ${body.websiteUrl?.trim() || null},
      ${body.defaultAssigneeId.trim()}::uuid
    )
    RETURNING id, name, channel_type as "channelType", widget_color as "widgetColor",
              widget_icon as "widgetIcon", widget_theme as "widgetTheme",
              greeting_message as "greetingMessage", welcome_title as "welcomeTitle",
              welcome_tagline as "welcomeTagline", website_url as "websiteUrl",
              default_assignee_id as "defaultAssigneeId", is_enabled as "isEnabled"
  `;

  const inbox = rows[0];
  if (!inbox) return Response.json({ error: 'Failed to create inbox' }, { status: 500 });

  return Response.json({ inbox }, { status: 201 });
}
