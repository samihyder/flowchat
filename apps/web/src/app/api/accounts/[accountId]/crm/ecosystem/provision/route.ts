import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { mergeAccountSettings, parseAccountSettings } from '@/lib/account-settings';
import { provisionLeadMonitorAttributes } from '@/lib/leadmonitor-provisioning';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const settings = parseAccountSettings((rows[0] as { settings: unknown } | undefined)?.settings);

  const integrations = await sql`
    SELECT integration_type, external_id, sync_enabled, settings
    FROM account_integrations
    WHERE account_id = ${accountId}::uuid
  `;

  return Response.json({
    leadmonitorSyncEnabled: settings.leadmonitorSyncEnabled ?? false,
    leadmonitorMinScore: settings.leadmonitorMinScore ?? 0,
    whatsappCrmSyncEnabled: settings.whatsappCrmSyncEnabled ?? false,
    integrations,
  });
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

  const body = (await req.json()) as {
    leadmonitorSyncEnabled?: boolean;
    leadmonitorMinScore?: number;
    whatsappCrmSyncEnabled?: boolean;
    leadmonitorOrgId?: string;
    whatsappAccountId?: string;
    whatsappApiKey?: string;
    whatsappBaseUrl?: string;
    provisionAttributes?: boolean;
  };

  const sql = neon(process.env.DATABASE_URL!);
  try {
    const current = await sql`SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
    const merged = mergeAccountSettings(
      (current[0] as { settings: unknown } | undefined)?.settings,
      {
        ...(body.leadmonitorSyncEnabled !== undefined
          ? { leadmonitorSyncEnabled: body.leadmonitorSyncEnabled }
          : {}),
        ...(body.leadmonitorMinScore !== undefined
          ? { leadmonitorMinScore: body.leadmonitorMinScore }
          : {}),
        ...(body.whatsappCrmSyncEnabled !== undefined
          ? { whatsappCrmSyncEnabled: body.whatsappCrmSyncEnabled }
          : {}),
      }
    );

    await sql`
      UPDATE accounts SET settings = ${JSON.stringify(merged)}::jsonb, updated_at = NOW()
      WHERE id = ${accountId}::uuid
    `;

    if (body.leadmonitorOrgId) {
      await sql`
        INSERT INTO account_integrations (account_id, integration_type, external_id, sync_enabled)
        VALUES (${accountId}::uuid, 'leadmonitor', ${body.leadmonitorOrgId}, true)
        ON CONFLICT (account_id, integration_type)
        DO UPDATE SET external_id = EXCLUDED.external_id, sync_enabled = true, updated_at = NOW()
      `;
    }

    if (body.whatsappAccountId) {
      const waSettings = {
        ...(body.whatsappApiKey ? { apiKey: body.whatsappApiKey } : {}),
        ...(body.whatsappBaseUrl ? { baseUrl: body.whatsappBaseUrl } : {}),
      };
      await sql`
        INSERT INTO account_integrations (account_id, integration_type, external_id, settings, sync_enabled)
        VALUES (
          ${accountId}::uuid,
          'whatsapp_crm',
          ${body.whatsappAccountId},
          ${JSON.stringify(waSettings)}::jsonb,
          true
        )
        ON CONFLICT (account_id, integration_type)
        DO UPDATE SET
          external_id = EXCLUDED.external_id,
          settings = account_integrations.settings || EXCLUDED.settings,
          sync_enabled = true,
          updated_at = NOW()
      `;
    }

    if (body.provisionAttributes !== false) {
      await provisionLeadMonitorAttributes(sql, accountId);
    }

    return Response.json({
      settings: {
        leadmonitorSyncEnabled: merged.leadmonitorSyncEnabled ?? false,
        leadmonitorMinScore: merged.leadmonitorMinScore ?? 0,
        whatsappCrmSyncEnabled: merged.whatsappCrmSyncEnabled ?? false,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ecosystem/provision] failed:', message);
    if (message.includes('account_integrations') && message.includes('does not exist')) {
      return Response.json(
        {
          error:
            'Database migration missing. Run packages/db/drizzle/0038_account_integrations.sql on Neon, then retry.',
        },
        { status: 503 }
      );
    }
    return Response.json({ error: message || 'Failed to save ecosystem settings' }, { status: 500 });
  }
}
