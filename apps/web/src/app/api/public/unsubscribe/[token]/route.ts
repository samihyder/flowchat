import { neon } from '@/lib/neon';
import { setContactPreference } from '@/lib/marketing/preferences';
import { unsubscribeByToken } from '@/lib/marketing/unsubscribe';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  let body: { preference?: string } = {};
  try {
    body = (await req.json()) as { preference?: string };
  } catch {
    // legacy empty body
  }

  if (body.preference === 'all' || body.preference === 'reduced' || body.preference === 'none') {
    const ok = await setContactPreference(sql, token, body.preference);
    if (!ok) return Response.json({ error: 'Invalid link' }, { status: 404 });
    return Response.json({ ok: true, preference: body.preference });
  }

  const ok = await unsubscribeByToken(sql, token);
  if (!ok) return Response.json({ error: 'Invalid unsubscribe link' }, { status: 404 });
  return Response.json({ ok: true, preference: 'none' });
}
