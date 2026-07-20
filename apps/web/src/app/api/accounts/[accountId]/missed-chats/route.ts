import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { processMissedChats } from '@/lib/missed-chats';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const alerts = await processMissedChats(sql, accountId);
  return Response.json({ alerts });
}
