import { createMiddleware } from 'hono/factory';
import { db, accountUsers } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export const accountMiddleware = createMiddleware<{
  Variables: {
    userId: string;
    sessionToken: string;
    accountId: string;
    agentRole: 'administrator' | 'agent';
  };
}>(async (c, next) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const [membership] = await db
    .select()
    .from(accountUsers)
    .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId)))
    .limit(1);

  if (!membership) return c.json({ error: 'Forbidden' }, 403);

  c.set('accountId', accountId);
  c.set('agentRole', membership.role);
  await next();
});

export const adminMiddleware = createMiddleware<{
  Variables: {
    userId: string;
    sessionToken: string;
    accountId: string;
    agentRole: 'administrator' | 'agent';
  };
}>(async (c, next) => {
  if (c.get('agentRole') !== 'administrator') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
});
