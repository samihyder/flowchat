import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { mergeContacts } from '@/lib/contact-merge';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required to merge contacts' }, { status: 403 });
  }

  const body = (await req.json()) as { primaryId?: string; secondaryId?: string };
  if (!body.primaryId || !body.secondaryId) {
    return Response.json({ error: 'primaryId and secondaryId are required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const result = await mergeContacts(sql, accountId, body.primaryId, body.secondaryId);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Merge failed' },
      { status: 400 }
    );
  }
}
