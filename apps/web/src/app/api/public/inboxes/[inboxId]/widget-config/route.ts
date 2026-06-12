import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { isDomainAllowed, parseAllowedDomains } from '@/lib/domain-allowlist';
import { mergeWidgetTheme } from '@/lib/widget-theme';

type Params = { params: Promise<{ inboxId: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { inboxId } = await params;
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return Response.json(
        { error: 'Widget API not configured' },
        { status: 503, headers: corsHeaders() }
      );
    }

    const origin = req.headers.get('origin') ?? req.headers.get('referer');
    const sql = neon(databaseUrl);

    const rows = await sql`
      SELECT id, name, greeting_message as "greetingMessage",
             welcome_title as "welcomeTitle", welcome_tagline as "welcomeTagline",
             widget_color as "widgetColor", widget_icon as "widgetIcon",
             widget_theme as "widgetTheme", allowed_domains as "allowedDomains",
             pre_chat_fields as "preChatFields", csat_enabled as "csatEnabled"
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
      allowedDomains: unknown;
      preChatFields: unknown;
      csatEnabled: boolean;
    } | undefined;

    if (!inbox) {
      return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
    }

    const allowedDomains = parseAllowedDomains(inbox.allowedDomains);
    if (!isDomainAllowed(allowedDomains, origin)) {
      return Response.json(
        {
          error:
            'Domain not authorized. Add this website under FlowChat → Settings → Inboxes → Allowed domains.',
        },
        { status: 403, headers: corsHeaders() }
      );
    }

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
          preChatFields: inbox.preChatFields ?? [],
          csatEnabled: inbox.csatEnabled ?? false,
        },
      },
      { headers: { ...corsHeaders(), 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch (err) {
    console.error('[widget-config]', err);
    return Response.json(
      { error: 'Failed to load widget settings' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
