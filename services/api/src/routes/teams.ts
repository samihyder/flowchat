import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, teams, teamMembers, accountUsers, users } from '../db/index.js';
import { sessionMiddleware } from '../middleware/session.js';
import { accountMiddleware, adminMiddleware } from '../middleware/account.js';

export const teamsRouter = new Hono();

teamsRouter.use('*', sessionMiddleware);
teamsRouter.use('*', accountMiddleware);

// List all teams in an account
teamsRouter.get('/', async (c) => {
  const accountId = c.get('accountId');

  const rows = await db
    .select()
    .from(teams)
    .where(eq(teams.accountId, accountId));

  return c.json({ teams: rows });
});

// Create a team
teamsRouter.post(
  '/',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const { name, description } = c.req.valid('json');

    const [team] = await db
      .insert(teams)
      .values({ accountId, name, description })
      .returning();

    return c.json({ team }, 201);
  }
);

// Update a team
teamsRouter.patch(
  '/:teamId',
  adminMiddleware,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(1000).nullable().optional(),
      isEnabled: z.boolean().optional(),
    })
  ),
  async (c) => {
    const accountId = c.get('accountId');
    const teamId = c.req.param('teamId');
    const data = c.req.valid('json');

    const [existing] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.accountId, accountId)))
      .limit(1);

    if (!existing) return c.json({ error: 'Team not found' }, 404);

    const [updated] = await db
      .update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(teams.id, teamId), eq(teams.accountId, accountId)))
      .returning();

    return c.json({ team: updated });
  }
);

// Delete a team
teamsRouter.delete('/:teamId', adminMiddleware, async (c) => {
  const accountId = c.get('accountId');
  const teamId = c.req.param('teamId');

  const [existing] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.accountId, accountId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Team not found' }, 404);

  await db.delete(teams).where(eq(teams.id, teamId));

  return c.json({ message: 'Team deleted successfully' });
});

// List team members
teamsRouter.get('/:teamId/members', async (c) => {
  const accountId = c.get('accountId');
  const teamId = c.req.param('teamId');

  const [existing] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.accountId, accountId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Team not found' }, 404);

  const members = await db
    .select({
      userId: teamMembers.userId,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: accountUsers.role,
      availability: accountUsers.availability,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .innerJoin(
      accountUsers,
      and(eq(accountUsers.userId, teamMembers.userId), eq(accountUsers.accountId, accountId))
    )
    .where(eq(teamMembers.teamId, teamId));

  return c.json({ members });
});

// Add agent to team
teamsRouter.post(
  '/:teamId/members',
  adminMiddleware,
  zValidator('json', z.object({ userId: z.string().uuid() })),
  async (c) => {
    const accountId = c.get('accountId');
    const teamId = c.req.param('teamId');
    const { userId } = c.req.valid('json');

    const [team] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.accountId, accountId)))
      .limit(1);

    if (!team) return c.json({ error: 'Team not found' }, 404);

    const [membership] = await db
      .select()
      .from(accountUsers)
      .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId)))
      .limit(1);

    if (!membership) return c.json({ error: 'User is not an agent in this account' }, 404);

    const [existing] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (existing) return c.json({ error: 'Agent is already in this team' }, 409);

    await db.insert(teamMembers).values({ teamId, userId });

    return c.json({ message: 'Agent added to team' }, 201);
  }
);

// Remove agent from team
teamsRouter.delete('/:teamId/members/:userId', adminMiddleware, async (c) => {
  const accountId = c.get('accountId');
  const teamId = c.req.param('teamId');
  const userId = c.req.param('userId');

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.accountId, accountId)))
    .limit(1);

  if (!team) return c.json({ error: 'Team not found' }, 404);

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  return c.json({ message: 'Agent removed from team' });
});
