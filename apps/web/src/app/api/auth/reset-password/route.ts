import { hashPassword } from '@/lib/auth-server';
import { resetPassword, validatePasswordResetToken } from '@/lib/password-reset';

export async function GET(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const token = new URL(req.url).searchParams.get('token')?.trim();
  if (!token) return Response.json({ valid: false });

  const valid = await validatePasswordResetToken(token);
  return Response.json({ valid: !!valid });
}

export async function POST(req: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const body = (await req.json()) as { token?: string; password?: string };
  const token = body.token?.trim();
  const password = body.password;

  if (!token || !password) {
    return Response.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const ok = await resetPassword(token, passwordHash);
  if (!ok) {
    return Response.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  return Response.json({ ok: true });
}
