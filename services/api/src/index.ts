import './load-env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { env } from './lib/env.js';
import { authRouter } from './routes/auth.js';
import { agentsRouter } from './routes/agents.js';
import { teamsRouter } from './routes/teams.js';
import { inboxesRouter } from './routes/inboxes.js';
import { accountsRouter } from './routes/accounts.js';
import { twoFaRouter } from './routes/auth-2fa.js';
import { googleAuthRouter } from './routes/auth-google.js';
import { publicWidgetRouter } from './routes/public/widget.js';
import { conversationsRouter } from './routes/conversations.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0]!;
      if (allowedOrigins.includes(origin)) return origin;
      // Allow any Vercel preview/production deployment.
      if (origin.endsWith('.vercel.app')) return origin;
      return allowedOrigins[0]!;
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Health check
app.get('/health', (c) =>
  c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() })
);

// Routes
app.route('/auth', authRouter);
app.route('/accounts/:accountId/agents', agentsRouter);
app.route('/accounts/:accountId/teams', teamsRouter);
app.route('/accounts/:accountId/inboxes', inboxesRouter);
app.route('/accounts/:accountId', accountsRouter);
app.route('/auth/2fa', twoFaRouter);
app.route('/auth/google', googleAuthRouter);
app.route('/public', publicWidgetRouter);
app.route('/accounts/:accountId/conversations', conversationsRouter);

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = env.PORT;

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 FlowChat API running on http://localhost:${port}`);
});
