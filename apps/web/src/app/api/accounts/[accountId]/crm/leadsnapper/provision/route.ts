import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { mergeAccountSettings, parseAccountSettings } from '@/lib/account-settings';
import { provisionLeadSnapperAttributes } from '@/lib/leadsnapper-provisioning';

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

  return Response.json({
    leadsnapperSyncEnabled: settings.leadsnapperSyncEnabled ?? false,
    leadsnapperMinPriority: settings.leadsnapperMinPriority ?? 'all',
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
    leadsnapperSyncEnabled?: boolean;
    leadsnapperMinPriority?: 'Hot' | 'Warm' | 'all';
    provisionAttributes?: boolean;
  };

  const sql = neon(process.env.DATABASE_URL!);
  const current = await sql`SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const merged = mergeAccountSettings(
    (current[0] as { settings: unknown } | undefined)?.settings,
    {
      ...(body.leadsnapperSyncEnabled !== undefined
        ? { leadsnapperSyncEnabled: body.leadsnapperSyncEnabled }
        : {}),
      ...(body.leadsnapperMinPriority !== undefined
        ? { leadsnapperMinPriority: body.leadsnapperMinPriority }
        : {}),
    }
  );

  await sql`
    UPDATE accounts SET settings = ${JSON.stringify(merged)}::jsonb, updated_at = NOW()
    WHERE id = ${accountId}::uuid
  `;

  let attributes = null;
  if (body.provisionAttributes !== false) {
    attributes = await provisionLeadSnapperAttributes(sql, accountId);
  }

  return Response.json({
    settings: {
      leadsnapperSyncEnabled: merged.leadsnapperSyncEnabled ?? false,
      leadsnapperMinPriority: merged.leadsnapperMinPriority ?? 'all',
    },
    attributes,
  });
}
