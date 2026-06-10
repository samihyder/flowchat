import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
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
           welcome_tagline as "welcomeTagline", is_enabled as "isEnabled"
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
  };

  if (!body.name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  const primary = body.widgetColor ?? '#6366F1';
  const theme = mergeWidgetTheme(body.widgetTheme, primary);

  const sql = neon(databaseUrl);
  const rows = await sql`
    INSERT INTO inboxes (
      account_id, name, channel_type, greeting_message,
      welcome_title, welcome_tagline, widget_color, widget_icon, widget_theme
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
      ${JSON.stringify(theme)}::jsonb
    )
    RETURNING id, name, channel_type as "channelType", widget_color as "widgetColor",
              widget_icon as "widgetIcon", widget_theme as "widgetTheme",
              greeting_message as "greetingMessage", welcome_title as "welcomeTitle",
              welcome_tagline as "welcomeTagline", is_enabled as "isEnabled"
  `;

  const inbox = rows[0];
  if (!inbox) return Response.json({ error: 'Failed to create inbox' }, { status: 500 });

  return Response.json({ inbox }, { status: 201 });
}
