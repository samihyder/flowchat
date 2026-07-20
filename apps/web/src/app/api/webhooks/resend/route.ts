import { neon } from '@/lib/neon';
import { handleResendWebhookEvent } from '@/lib/marketing/resend-events';
import type { AppSql } from '@/lib/db-sql';

export async function POST(req: Request) {
  const body = (await req.json()) as { type: string; data?: Record<string, unknown> };
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  await handleResendWebhookEvent(sql, body);
  return Response.json({ ok: true });
}
