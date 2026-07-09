import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { getWebAppOrigin } from '@/lib/marketing/origin';
import { sendPasswordResetEmail } from '@/lib/email';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

export function resetPasswordUrl(token: string): string {
  return `${getWebAppOrigin()}/reset-password?token=${token}`;
}

/** Look up an active user by email and, if found, email them a reset link. Always safe to call for any email. */
export async function requestPasswordReset(email: string): Promise<void> {
  const sql = getSql();
  const users = await sql`
    SELECT id, name FROM users WHERE LOWER(email) = ${email.toLowerCase()} AND password_hash IS NOT NULL LIMIT 1
  `;
  const user = users[0] as { id: string; name: string } | undefined;
  if (!user) return;

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await sql`
    INSERT INTO password_reset_tokens (token, user_id, expires_at)
    VALUES (${token}, ${user.id}::uuid, ${expiresAt.toISOString()}::timestamptz)
  `;

  await sendPasswordResetEmail(email, resetPasswordUrl(token), user.name);
}

export async function validatePasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT user_id as "userId"
    FROM password_reset_tokens
    WHERE token = ${token} AND used_at IS NULL AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0] as { userId: string } | undefined;
  return row ? { userId: row.userId } : null;
}

/** Consume the token, set the new password hash, and revoke all existing sessions for the user. */
export async function resetPassword(token: string, passwordHash: string): Promise<boolean> {
  const sql = getSql();
  const valid = await validatePasswordResetToken(token);
  if (!valid) return false;

  await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ${token}`;
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${valid.userId}::uuid`;
  await sql`DELETE FROM sessions WHERE user_id = ${valid.userId}::uuid`;
  return true;
}
