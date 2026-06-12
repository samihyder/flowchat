import { neon } from '@neondatabase/serverless';
import { confirmSubscription } from '@/lib/marketing/double-opt-in';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await confirmSubscription(sql, token);
  if (!ok) return Response.json({ error: 'Invalid or expired link' }, { status: 400 });
  return Response.json({ ok: true });
}
