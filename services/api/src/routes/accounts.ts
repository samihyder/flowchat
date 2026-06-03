import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, accounts } from '../db/index.js';
import { sessionMiddleware } from '../middleware/session.js';
import { accountMiddleware, adminMiddleware } from '../middleware/account.js';
import { getUploadUrl, r2Configured } from '../lib/storage.js';
import { createId } from '@paralleldrive/cuid2';

export const accountsRouter = new Hono();

accountsRouter.use('*', sessionMiddleware);
accountsRouter.use('*', accountMiddleware);

// Get account details
accountsRouter.get('/', async (c) => {
  const accountId = c.get('accountId');

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) return c.json({ error: 'Account not found' }, 404);

  return c.json({ account });
});

// Update account settings
accountsRouter.patch(
  '/',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(255).optional(),
      timezone: z.string().max(100).optional(),
      locale: z.string().max(10).optional(),
      logoUrl: z.string().url().nullable().optional(),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const data = c.req.valid('json');

    const [updated] = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();

    return c.json({ account: updated });
  }
);

// Get presigned URL for logo upload
accountsRouter.post('/logo-upload-url', adminMiddleware, async (c) => {
  if (!r2Configured) {
    return c.json({ error: 'Storage not configured' }, 503);
  }

  const accountId = c.get('accountId');
  const key = `logos/${accountId}/${createId()}.png`;
  const { uploadUrl, publicUrl } = await getUploadUrl(key, 'image/png');

  return c.json({ uploadUrl, publicUrl });
});
