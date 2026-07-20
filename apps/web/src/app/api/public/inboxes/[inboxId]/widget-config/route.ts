import { neon } from '@/lib/neon';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { isDomainAllowed, parseAllowedDomains } from '@/lib/domain-allowlist';
import { mergeWidgetTheme } from '@/lib/widget-theme';
import {
  resolveGreetingMessages,
  resolveWelcomeTagline,
  resolveWelcomeTitle,
} from '@/lib/welcome-messages';
import { parseAccountSettings } from '@/lib/account-settings';

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
      SELECT i.id, i.name, i.greeting_message as "greetingMessage",
             i.greeting_messages as "greetingMessages",
             i.welcome_title as "welcomeTitle", i.welcome_tagline as "welcomeTagline",
             i.widget_color as "widgetColor", i.widget_icon as "widgetIcon",
             i.widget_theme as "widgetTheme", i.allowed_domains as "allowedDomains",
             i.pre_chat_fields as "preChatFields", i.csat_enabled as "csatEnabled",
             a.settings as "accountSettings"
      FROM inboxes i
      INNER JOIN accounts a ON a.id = i.account_id
      WHERE i.id = ${inboxId}::uuid AND i.is_enabled = true
      LIMIT 1
    `;

    const inbox = rows[0] as {
      id: string;
      name: string;
      greetingMessage: string | null;
      greetingMessages: unknown;
      welcomeTitle: string | null;
      welcomeTagline: string | null;
      widgetColor: string | null;
      widgetIcon: string | null;
      widgetTheme: Record<string, string> | null;
      allowedDomains: unknown;
      preChatFields: unknown;
      csatEnabled: boolean;
      accountSettings: unknown;
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

    const primary = inbox.widgetColor ?? '#06B6D4';
    const accountSettings = parseAccountSettings(inbox.accountSettings);
    const greetingMessages = resolveGreetingMessages(
      inbox.greetingMessages,
      inbox.greetingMessage,
      accountSettings
    );

    return Response.json(
      {
        inbox: {
          id: inbox.id,
          name: inbox.name,
          greetingMessage: greetingMessages.join('\n'),
          greetingMessages,
          welcomeTitle: resolveWelcomeTitle(inbox.welcomeTitle, accountSettings),
          welcomeTagline: resolveWelcomeTagline(inbox.welcomeTagline, accountSettings),
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
