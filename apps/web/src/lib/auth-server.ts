import { createId } from '@paralleldrive/cuid2';
import { hash, verify } from '@node-rs/argon2';
import { neon } from '@neondatabase/serverless';
import { SESSION_IDLE_MS, SESSION_REMEMBER_ME_MS } from '@/lib/session-policy';

const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

export async function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, ARGON2_OPTIONS);
}

export async function createSession(
  userId: string,
  rememberMe = false,
  meta?: { userAgent?: string | null; ipAddress?: string | null }
) {
  const sql = getSql();
  const token = createId();
  const idleMs = rememberMe ? SESSION_REMEMBER_ME_MS : SESSION_IDLE_MS;
  const expiresAt = new Date(Date.now() + idleMs);
  await sql`
    INSERT INTO sessions (user_id, token, expires_at, remember_me, user_agent, ip_address)
    VALUES (
      ${userId}::uuid, ${token}, ${expiresAt.toISOString()}::timestamptz, ${rememberMe},
      ${meta?.userAgent ?? null}, ${meta?.ipAddress ?? null}
    )
  `;
  return { token, expiresAt: expiresAt.toISOString() };
}

/** Validate session and extend idle expiry (sliding 24h window, or 30d if "remember me" was checked). */
export async function touchSession(token: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT user_id as "userId", remember_me as "rememberMe"
    FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0] as { userId: string; rememberMe: boolean } | undefined;
  if (!row) return null;

  const idleMs = row.rememberMe ? SESSION_REMEMBER_ME_MS : SESSION_IDLE_MS;
  const expiresAt = new Date(Date.now() + idleMs);
  await sql`
    UPDATE sessions
    SET expires_at = ${expiresAt.toISOString()}::timestamptz, last_seen_at = NOW()
    WHERE token = ${token}
  `;
  return row.userId;
}
