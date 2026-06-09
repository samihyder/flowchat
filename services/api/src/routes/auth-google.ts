import { Hono } from 'hono';
import { Google } from 'arctic';
import { eq } from 'drizzle-orm';
import { generateState, generateCodeVerifier } from 'arctic';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db, users, accounts, accountUsers } from '../db/index.js';
import { createSession } from '../lib/auth.js';
import { env } from '../lib/env.js';

export const googleAuthRouter = new Hono();

function getGoogleClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.API_PUBLIC_URL}/auth/google/callback`
  );
}

// GET /auth/google — redirect to Google consent screen
googleAuthRouter.get('/', async (c) => {
  const google = getGoogleClient();
  if (!google) return c.json({ error: 'Google OAuth is not configured' }, 503);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);

  setCookie(c, 'google_oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 600,
    path: '/',
  });
  setCookie(c, 'google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 600,
    path: '/',
  });

  return c.redirect(url.toString());
});

// GET /auth/google/callback — exchange code, create/link user, redirect to web app
googleAuthRouter.get('/callback', async (c) => {
  const google = getGoogleClient();
  if (!google) return c.json({ error: 'Google OAuth is not configured' }, 503);

  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'google_oauth_state');
  const codeVerifier = getCookie(c, 'google_code_verifier');

  deleteCookie(c, 'google_oauth_state', { path: '/' });
  deleteCookie(c, 'google_code_verifier', { path: '/' });

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return c.redirect(`${env.WEB_APP_URL}/sign-in?error=oauth_failed`);
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const googleUserRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    });

    if (!googleUserRes.ok) {
      return c.redirect(`${env.WEB_APP_URL}/sign-in?error=oauth_profile`);
    }

    const profile = (await googleUserRes.json()) as {
      sub: string;
      email: string;
      name: string;
      picture?: string;
    };

    if (!profile.email) {
      return c.redirect(`${env.WEB_APP_URL}/sign-in?error=oauth_email`);
    }

    let user =
      (await db.select().from(users).where(eq(users.googleId, profile.sub)).limit(1))[0] ??
      (await db.select().from(users).where(eq(users.email, profile.email)).limit(1))[0];

    if (user) {
      if (!user.googleId) {
        await db
          .update(users)
          .set({ googleId: profile.sub, avatarUrl: profile.picture ?? user.avatarUrl })
          .where(eq(users.id, user.id));
      }
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: profile.name || profile.email.split('@')[0]!,
          email: profile.email,
          googleId: profile.sub,
          avatarUrl: profile.picture ?? null,
          emailVerifiedAt: new Date(),
        })
        .returning();
      user = created!;
    }

    if (!user.isActive) {
      return c.redirect(`${env.WEB_APP_URL}/sign-in?error=account_disabled`);
    }

    if (user.totpEnabledAt) {
      return c.redirect(
        `${env.WEB_APP_URL}/sign-in?requiresTwoFactor=1&userId=${user.id}`
      );
    }

    const [membership] = await db
      .select({ accountId: accountUsers.accountId })
      .from(accountUsers)
      .where(eq(accountUsers.userId, user.id))
      .limit(1);

    let account = membership
      ? (await db.select().from(accounts).where(eq(accounts.id, membership.accountId)).limit(1))[0]
      : undefined;

    if (!account) {
      const workspaceName = `${user.name}'s Workspace`;
      const slug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);

      const [createdAccount] = await db
        .insert(accounts)
        .values({ name: workspaceName, slug: `${slug}-${Date.now()}` })
        .returning();

      account = createdAccount;
      await db.insert(accountUsers).values({
        userId: user.id,
        accountId: account!.id,
        role: 'administrator',
        availability: 'online',
      });
    }

    const { token } = await createSession(user.id);

    const params = new URLSearchParams({
      token,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      accountId: account!.id,
      accountName: account!.name,
    });

    return c.redirect(`${env.WEB_APP_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    return c.redirect(`${env.WEB_APP_URL}/sign-in?error=oauth_failed`);
  }
});
