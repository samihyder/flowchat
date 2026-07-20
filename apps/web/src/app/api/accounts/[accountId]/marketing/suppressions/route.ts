import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { suppressEmail } from '@/lib/marketing/suppressions';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT id, email, reason, created_at as "createdAt"
    FROM marketing_suppressions WHERE account_id = ${accountId}::uuid
    ORDER BY created_at DESC LIMIT 200
  `;
  return Response.json({
    suppressions: (rows as { createdAt: Date }[]).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { email?: string; reason?: string };
  if (!body.email?.trim()) return Response.json({ error: 'email is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  await suppressEmail(sql, accountId, body.email.trim(), body.reason ?? 'manual');
  return Response.json({ ok: true }, { status: 201 });
}
