import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { encodeBase32, decodeBase32 } from 'oslo/encoding';
import { hash, verify as argon2Verify } from '@node-rs/argon2';
import { createId } from '@paralleldrive/cuid2';
import { db, users, accounts, accountUsers } from '../db/index.js';
import { sessionMiddleware } from '../middleware/session.js';
import { createSession } from '../lib/auth.js';

export const twoFaRouter = new Hono();

twoFaRouter.use('/setup', sessionMiddleware);
twoFaRouter.use('/enable', sessionMiddleware);
twoFaRouter.use('/disable', sessionMiddleware);

// Generate TOTP secret + URI for authenticator app
twoFaRouter.get('/setup', async (c) => {
  const userId = c.get('userId');

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: 'User not found' }, 404);
  if (user.totpEnabledAt) return c.json({ error: '2FA already enabled' }, 409);

  const secretBytes = globalThis.crypto.getRandomValues(new Uint8Array(20));
  const secret = encodeBase32(secretBytes);

  await db.update(users).set({ totpSecret: secret }).where(eq(users.id, userId));

  const uri = createTOTPKeyURI('FlowChat', user.email, secretBytes);

  return c.json({ secret, uri });
});

// Verify first code → enable 2FA → return one-time backup codes
twoFaRouter.post(
  '/enable',
  zValidator('json', z.object({ code: z.string().length(6) })),
  async (c) => {
    const userId = c.get('userId');
    const { code } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpSecret) return c.json({ error: 'Start 2FA setup first' }, 400);
    if (user.totpEnabledAt) return c.json({ error: '2FA already enabled' }, 409);

    const secretBytes = decodeBase32(user.totpSecret);
    const valid = await new TOTPController().verify(code, secretBytes);
    if (!valid) return c.json({ error: 'Invalid code — check your authenticator app' }, 400);

    const backupCodes = Array.from({ length: 8 }, () =>
      `${createId().slice(0, 5)}-${createId().slice(0, 5)}`
    );
    const hashedCodes = await Promise.all(
      backupCodes.map((bc) => hash(bc, { memoryCost: 1024, timeCost: 1, parallelism: 1 }))
    );

    await db
      .update(users)
      .set({ totpEnabledAt: new Date(), backupCodes: hashedCodes })
      .where(eq(users.id, userId));

    return c.json({ backupCodes });
  }
);

// Disable 2FA using TOTP code or backup code
twoFaRouter.post(
  '/disable',
  zValidator('json', z.object({ code: z.string() })),
  async (c) => {
    const userId = c.get('userId');
    const { code } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpEnabledAt || !user.totpSecret) {
      return c.json({ error: '2FA is not enabled' }, 400);
    }

    let valid = false;
    if (code.length === 6) {
      const secretBytes = decodeBase32(user.totpSecret);
      valid = await new TOTPController().verify(code, secretBytes);
    } else if (user.backupCodes) {
      for (const hashed of user.backupCodes) {
        if (await argon2Verify(hashed, code)) { valid = true; break; }
      }
    }

    if (!valid) return c.json({ error: 'Invalid code' }, 400);

    await db
      .update(users)
      .set({ totpSecret: null, totpEnabledAt: null, backupCodes: null })
      .where(eq(users.id, userId));

    return c.json({ message: '2FA disabled' });
  }
);

// Verify TOTP during sign-in (after requiresTwoFactor: true response)
twoFaRouter.post(
  '/verify',
  zValidator('json', z.object({ userId: z.string().uuid(), code: z.string() })),
  async (c) => {
    const { userId, code } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpEnabledAt || !user.totpSecret) {
      return c.json({ error: 'User not found or 2FA not enabled' }, 400);
    }

    let valid = false;
    if (code.length === 6) {
      const secretBytes = decodeBase32(user.totpSecret);
      valid = await new TOTPController().verify(code, secretBytes);
    } else if (user.backupCodes) {
      for (let i = 0; i < user.backupCodes.length; i++) {
        if (await argon2Verify(user.backupCodes[i]!, code)) {
          valid = true;
          const remaining = user.backupCodes.filter((_, idx) => idx !== i);
          await db.update(users).set({ backupCodes: remaining }).where(eq(users.id, userId));
          break;
        }
      }
    }

    if (!valid) return c.json({ error: 'Invalid code' }, 401);

    const { token, expiresAt } = await createSession(userId);

    const [membership] = await db
      .select({ accountId: accountUsers.accountId })
      .from(accountUsers)
      .where(eq(accountUsers.userId, userId))
      .limit(1);

    const [account] = membership
      ? await db.select().from(accounts).where(eq(accounts.id, membership.accountId)).limit(1)
      : [];

    return c.json({
      user: { id: user.id, name: user.name, email: user.email },
      account: account ? { id: account.id, name: account.name, slug: account.slug } : null,
      token,
      expiresAt,
    });
  }
);
