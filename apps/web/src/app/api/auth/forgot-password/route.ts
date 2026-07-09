import { requestPasswordReset } from '@/lib/password-reset';

export async function POST(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const body = (await req.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always respond ok, whether or not the email is registered, to avoid leaking account existence.
  await requestPasswordReset(email).catch(() => {});

  return Response.json({ ok: true });
}
