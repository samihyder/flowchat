import { createServer, IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { validateSession } from './lib/auth.js';
import { rooms } from './lib/rooms.js';
import { publisher, subscriber } from './lib/redis.js';
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

wss.on('connection', async (ws, req) => {
  const token = extractToken(req);

  if (!token) {
    ws.close(4001, 'Missing token');
    return;
  }

  const session = await validateSession(token);
  if (!session) {
    ws.close(4001, 'Invalid or expired token');
    return;
  }

  const { userId, accountId } = session;

  // Auto-subscribe to the user's account room
  if (accountId) {
    rooms.join(`account:${accountId}`, ws);
  }

  ws.send(JSON.stringify({ type: 'connected', userId, accountId }));

  ws.on('message', (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

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
        const room = msg['accountId'] as string | undefined;
        const availability = msg['availability'] as string | undefined;
        if (room && availability) {
          const payload = JSON.stringify({ type: 'presence_updated', userId, availability });
          // Broadcast to other clients in the room
          rooms.broadcast(`account:${room}`, payload, ws);
          // Publish to Redis so other WS instances broadcast too
          publisher.publish(`account:${room}`, payload);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    rooms.leaveAll(ws);
  });

  ws.on('error', (err) => {
    console.error(`[ws] client error: ${err.message}`);
    rooms.leaveAll(ws);
  });
});

// ─── Redis pub/sub ───────────────────────────────────────────────────────────

async function startRedis() {
  await Promise.all([publisher.connect(), subscriber.connect()]);

  // Subscribe to all account channels
  await subscriber.psubscribe('account:*');

  subscriber.on('pmessage', (_pattern, channel, message) => {
    rooms.broadcast(channel, message);
  });

  console.log('[redis] pub/sub connected');
}

startRedis().catch((err) => console.error('[redis] failed to connect:', err.message));

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(env.PORT, () => {
  console.log(`🔌 FlowChat WS running on port ${env.PORT}`);
});
