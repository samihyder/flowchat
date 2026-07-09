import { hash, verify } from '@node-rs/argon2';
import { createId } from '@paralleldrive/cuid2';
import { db, sessions, users, accounts, accountUsers } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { sign, verify as jwtVerify } from 'hono/jwt';
import { env } from './env.js';

const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
const SESSION_REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;

const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string) {
  return verify(hash, password, ARGON2_OPTIONS);
}

export async function createSession(
  userId: string,
  rememberMe = false,
  meta?: { userAgent?: string | null; ipAddress?: string | null }
) {
  const token = createId();
  const idleMs = rememberMe ? SESSION_REMEMBER_ME_MS : SESSION_IDLE_MS;
  const expiresAt = new Date(Date.now() + idleMs);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
    rememberMe,
    userAgent: meta?.userAgent ?? null,
    ipAddress: meta?.ipAddress ?? null,
  });

  return { token, expiresAt };
}

async function extendSession(token: string, rememberMe: boolean) {
  const idleMs = rememberMe ? SESSION_REMEMBER_ME_MS : SESSION_IDLE_MS;
  const expiresAt = new Date(Date.now() + idleMs);
  await db.update(sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(sessions.token, token));
}

export async function validateSession(token: string) {
  const [session] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session) return null;
  if (session.session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }

  await extendSession(token, session.session.rememberMe);
  return session;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getUserAccountRole(userId: string, accountId: string) {
  const [row] = await db
    .select()
    .from(accountUsers)
    .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId)))
    .limit(1);

  return row ?? null;
}
