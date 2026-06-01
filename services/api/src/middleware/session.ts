import { createMiddleware } from 'hono/factory';
import { validateSession } from '../lib/auth.js';

export const sessionMiddleware = createMiddleware<{
  Variables: {
    userId: string;
    sessionToken: string;
  };
}>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ??
    getCookie(c, 'fc_session');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await validateSession(token);
  if (!session) {
    return c.json({ error: 'Session expired or invalid' }, 401);
  }

  c.set('userId', session.user.id);
  c.set('sessionToken', token);
  await next();
});

function getCookie(c: any, name: string): string | undefined {
  const header = c.req.header('Cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : undefined;
}
