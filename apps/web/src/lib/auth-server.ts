import { createId } from '@paralleldrive/cuid2';
import { hash, verify } from '@node-rs/argon2';
import { neon } from '@neondatabase/serverless';
import { SESSION_IDLE_MS } from '@/lib/session-policy';

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

export async function createSession(userId: string) {
  const sql = getSql();
  const token = createId();
  const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
  await sql`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}::uuid, ${token}, ${expiresAt.toISOString()}::timestamptz)
  `;
  return { token, expiresAt: expiresAt.toISOString() };
}

/** Validate session and extend idle expiry (sliding 24h window). */
export async function touchSession(token: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT user_id as "userId"
    FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
    LIMIT 1
  `;
  const userId = (rows[0] as { userId: string } | undefined)?.userId;
  if (!userId) return null;

  const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
  await sql`
    UPDATE sessions
    SET expires_at = ${expiresAt.toISOString()}::timestamptz
    WHERE token = ${token}
  `;
  return userId;
}
