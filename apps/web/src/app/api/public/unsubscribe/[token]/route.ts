import { neon } from '@neondatabase/serverless';
import { unsubscribeByToken } from '@/lib/marketing/unsubscribe';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await unsubscribeByToken(sql, token);
  if (!ok) return Response.json({ error: 'Invalid unsubscribe link' }, { status: 404 });
  return Response.json({ ok: true });
}
