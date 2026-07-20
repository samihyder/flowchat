import { neon } from '@/lib/neon';
import { touchSession } from '@/lib/auth-server';
import { getBearerToken } from '@/lib/db-auth';
import { getClientIp } from '@/lib/request-ip';

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const userId = await touchSession(token);
  if (!userId) return Response.json({ error: 'Session expired or invalid' }, { status: 401 });

  const sql = neon(databaseUrl);
  const users = await sql`SELECT is_super_admin as "isSuperAdmin" FROM users WHERE id = ${userId}::uuid LIMIT 1`;
  const user = users[0] as { isSuperAdmin: boolean } | undefined;
  if (!user?.isSuperAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { accountId?: string };
  const accountId = body.accountId;
  if (!accountId) return Response.json({ error: 'accountId is required' }, { status: 400 });

  const accounts = await sql`SELECT id, name, slug FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const account = accounts[0] as { id: string; name: string; slug: string } | undefined;
  if (!account) return Response.json({ error: 'Workspace not found' }, { status: 404 });

  await sql`
    INSERT INTO audit_logs (account_id, actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      ${accountId}::uuid,
      ${userId}::uuid,
      'super_admin_workspace_access',
      'account',
      ${accountId},
      ${JSON.stringify({ ip: getClientIp(req) })}::jsonb
    )
  `;

  return Response.json({ account });
}
