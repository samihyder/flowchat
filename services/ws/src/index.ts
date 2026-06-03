import { createServer, IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { validateSession } from './lib/auth.js';
import { rooms } from './lib/rooms.js';
import { publisher, subscriber } from './lib/redis.js';
import { setAvailability } from './lib/presence.js';
import { env } from './lib/env.js';

// ─── HTTP server (health check) ─────────────────────────────────────────────

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: wss.clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// ─── WebSocket server ────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server });

function extractToken(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? '/', `http://localhost`);
  return url.searchParams.get('token');
}

function broadcast(accountId: string, payload: object, exclude?: WebSocket) {
  const message = JSON.stringify(payload);
  rooms.broadcast(`account:${accountId}`, message, exclude);
  publisher.publish(`account:${accountId}`, message);
}

wss.on('connection', async (ws, req) => {
  const token = extractToken(req);

  if (!token) { ws.close(4001, 'Missing token'); return; }

  const session = await validateSession(token);
  if (!session) { ws.close(4001, 'Invalid or expired token'); return; }

  const { userId, accountId } = session;

  if (accountId) {
    rooms.join(`account:${accountId}`, ws);

    // Mark online
    await setAvailability(userId, accountId, 'online');
    broadcast(accountId, { type: 'presence_updated', userId, availability: 'online' }, ws);
  }

  ws.send(JSON.stringify({ type: 'connected', userId, accountId }));

  ws.on('message', async (data) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(data.toString()) as Record<string, unknown>; }
    catch { return; }

    switch (msg['type']) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe': {
        const room = msg['accountId'] as string | undefined;
        if (room) {
          rooms.join(`account:${room}`, ws);
          ws.send(JSON.stringify({ type: 'subscribed', accountId: room }));
        }
        break;
      }

      case 'presence': {
        const avail = msg['availability'] as 'online' | 'busy' | 'offline' | undefined;
        if (accountId && avail && ['online', 'busy', 'offline'].includes(avail)) {
          await setAvailability(userId, accountId, avail);
          broadcast(accountId, { type: 'presence_updated', userId, availability: avail }, ws);
        }
        break;
      }
    }
  });

  ws.on('close', async () => {
    rooms.leaveAll(ws);
    // Auto-offline on disconnect
    if (accountId) {
      await setAvailability(userId, accountId, 'offline');
      broadcast(accountId, { type: 'presence_updated', userId, availability: 'offline' });
    }
  });

  ws.on('error', (err: Error) => {
    console.error(`[ws] client error: ${err.message}`);
    rooms.leaveAll(ws);
  });
});

// ─── Redis pub/sub ───────────────────────────────────────────────────────────

async function startRedis() {
  await Promise.all([publisher.connect(), subscriber.connect()]);
  await subscriber.psubscribe('account:*');
  subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
    rooms.broadcast(channel, message);
  });
  console.log('[redis] pub/sub connected');
}

startRedis().catch((err: Error) => console.error('[redis] failed to connect:', err.message));

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(env.PORT, () => {
  console.log(`🔌 FlowChat WS running on port ${env.PORT}`);
});
