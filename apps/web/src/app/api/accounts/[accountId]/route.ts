import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { mergeAccountSettings, parseAccountSettings } from '@/lib/account-settings';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT id, name, slug, timezone, locale, logo_url as "logoUrl", settings
    FROM accounts WHERE id = ${accountId}::uuid LIMIT 1
  `;

  if (!rows[0]) return Response.json({ error: 'Account not found' }, { status: 404 });
  const row = rows[0] as { settings: unknown } & Record<string, unknown>;
  return Response.json({
    account: { ...row, settings: parseAccountSettings(row.settings) },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    timezone?: string;
    locale?: string;
    logoUrl?: string | null;
    settings?: {
      allowedInviteDomains?: string[];
      dataRetentionDays?: number;
      crmImportEnabled?: boolean;
      crmExportEnabled?: boolean;
      crmImportAllowedUserIds?: string[];
      crmExportAllowedUserIds?: string[];
      autoMessages?: string[];
      autoWelcomeTitle?: string;
      autoWelcomeTagline?: string;
    };
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const current = await sql`SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const mergedSettings = body.settings
    ? mergeAccountSettings((current[0] as { settings: unknown } | undefined)?.settings, body.settings)
    : undefined;

  const rows = await sql`
    UPDATE accounts SET
      name = COALESCE(${body.name ?? null}, name),
      timezone = COALESCE(${body.timezone ?? null}, timezone),
      locale = COALESCE(${body.locale ?? null}, locale),
      logo_url = COALESCE(${body.logoUrl !== undefined ? body.logoUrl : null}, logo_url),
      settings = COALESCE(${mergedSettings ? JSON.stringify(mergedSettings) : null}::jsonb, settings),
      updated_at = NOW()
    WHERE id = ${accountId}::uuid
    RETURNING id, name, slug, timezone, locale, logo_url as "logoUrl", settings
  `;

  if (!rows[0]) return Response.json({ error: 'Account not found' }, { status: 404 });
  const row = rows[0] as { settings: unknown } & Record<string, unknown>;
  return Response.json({
    account: { ...row, settings: parseAccountSettings(row.settings) },
  });
}
