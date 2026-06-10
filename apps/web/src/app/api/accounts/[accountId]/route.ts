import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

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
    SELECT id, name, slug, timezone, locale, logo_url as "logoUrl"
    FROM accounts WHERE id = ${accountId}::uuid LIMIT 1
  `;

  if (!rows[0]) return Response.json({ error: 'Account not found' }, { status: 404 });
  return Response.json({ account: rows[0] });
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
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    UPDATE accounts SET
      name = COALESCE(${body.name ?? null}, name),
      timezone = COALESCE(${body.timezone ?? null}, timezone),
      locale = COALESCE(${body.locale ?? null}, locale),
      logo_url = COALESCE(${body.logoUrl !== undefined ? body.logoUrl : null}, logo_url),
      updated_at = NOW()
    WHERE id = ${accountId}::uuid
    RETURNING id, name, slug, timezone, locale, logo_url as "logoUrl"
  `;

  if (!rows[0]) return Response.json({ error: 'Account not found' }, { status: 404 });
  return Response.json({ account: rows[0] });
}
