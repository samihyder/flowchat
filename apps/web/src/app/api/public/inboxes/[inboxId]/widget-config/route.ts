import { neon } from '@neondatabase/serverless';
import { mergeWidgetTheme } from '@/lib/widget-theme';

type Params = { params: Promise<{ inboxId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { inboxId } = await params;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT id, name, greeting_message as "greetingMessage",
           welcome_title as "welcomeTitle", welcome_tagline as "welcomeTagline",
           widget_color as "widgetColor", widget_icon as "widgetIcon",
           widget_theme as "widgetTheme"
    FROM inboxes
    WHERE id = ${inboxId}::uuid AND is_enabled = true
    LIMIT 1
  `;

  const inbox = rows[0] as {
    id: string;
    name: string;
    greetingMessage: string | null;
    welcomeTitle: string | null;
    welcomeTagline: string | null;
    widgetColor: string | null;
    widgetIcon: string | null;
    widgetTheme: Record<string, string> | null;
  } | undefined;

  if (!inbox) return Response.json({ error: 'Inbox not found' }, { status: 404 });

  const primary = inbox.widgetColor ?? '#6366F1';

  return Response.json(
    {
      inbox: {
        id: inbox.id,
        name: inbox.name,
        greetingMessage: inbox.greetingMessage,
        welcomeTitle: inbox.welcomeTitle ?? 'Hi there!',
        welcomeTagline: inbox.welcomeTagline ?? 'We typically reply in a few minutes',
        widgetColor: primary,
        widgetIcon: inbox.widgetIcon ?? 'chat',
        widgetTheme: mergeWidgetTheme(inbox.widgetTheme, primary),
      },
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
