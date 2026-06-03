import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { env } from './lib/env.js';
import { authRouter } from './routes/auth.js';
import { agentsRouter } from './routes/agents.js';
import { teamsRouter } from './routes/teams.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]!),
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
