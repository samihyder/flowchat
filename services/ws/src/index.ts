import './load-env.js';
import { createServer, IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { validateSession, validateVisitor } from './lib/auth.js';
import { rooms } from './lib/rooms.js';
import { publisher, subscriber } from './lib/redis.js';
import { setAvailability } from './lib/presence.js';
import { env } from './lib/env.js';

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: wss.clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

type ClientMeta =
  | { kind: 'agent'; userId: string; accountId: string }
  | { kind: 'visitor'; conversationId: string; accountId: string; contactId: string };

const clientMeta = new WeakMap<WebSocket, ClientMeta>();

function parseQuery(req: IncomingMessage) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  return {
    token: url.searchParams.get('token'),
    accountId: url.searchParams.get('accountId'),
    visitorToken: url.searchParams.get('visitorToken'),
    conversationId: url.searchParams.get('conversationId'),
  };
}

function broadcastAccount(accountId: string, payload: object, exclude?: WebSocket) {
  const message = JSON.stringify(payload);
  rooms.broadcast(`account:${accountId}`, message, exclude);
  publisher.publish(`account:${accountId}`, message);
}

function broadcastConversation(conversationId: string, payload: object, exclude?: WebSocket) {
  const message = JSON.stringify(payload);
  rooms.broadcast(`conversation:${conversationId}`, message, exclude);
  publisher.publish(`conversation:${conversationId}`, message);
}

wss.on('connection', async (ws, req) => {
  const { token, accountId: queryAccountId, visitorToken, conversationId } = parseQuery(req);

  if (visitorToken && conversationId) {
    const visitor = await validateVisitor(conversationId, visitorToken);
    if (!visitor) {
      ws.close(4001, 'Invalid visitor session');
      return;
    }

    clientMeta.set(ws, {
      kind: 'visitor',
      conversationId: visitor.conversationId,
      accountId: visitor.accountId,
      contactId: visitor.contactId,
    });

    rooms.join(`conversation:${conversationId}`, ws);
    ws.send(JSON.stringify({ type: 'connected', role: 'visitor', conversationId }));
  } else if (token) {
    const session = await validateSession(token, queryAccountId);
    if (!session?.accountId) {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    const { userId, accountId } = session;
    clientMeta.set(ws, { kind: 'agent', userId, accountId });
    rooms.join(`account:${accountId}`, ws);

    await setAvailability(userId, accountId, 'online');
    broadcastAccount(accountId, { type: 'presence_updated', userId, availability: 'online' }, ws);

    ws.send(JSON.stringify({ type: 'connected', role: 'agent', userId, accountId }));
  } else {
    ws.close(4001, 'Missing credentials');
    return;
  }

  ws.on('message', async (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

    const meta = clientMeta.get(ws);
    if (!meta) return;

    switch (msg['type']) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe_conversation': {
        const cid = msg['conversationId'] as string | undefined;
        if (cid && meta.kind === 'agent') {
          rooms.join(`conversation:${cid}`, ws);
          ws.send(JSON.stringify({ type: 'subscribed', conversationId: cid }));
        }
        break;
      }

      case 'presence': {
        if (meta.kind !== 'agent') break;
        const avail = msg['availability'] as 'online' | 'busy' | 'offline' | undefined;
        if (avail && ['online', 'busy', 'offline'].includes(avail)) {
          await setAvailability(meta.userId, meta.accountId, avail);
          broadcastAccount(
            meta.accountId,
            { type: 'presence_updated', userId: meta.userId, availability: avail },
            ws
          );
        }
        break;
      }

      case 'typing': {
        const cid = msg['conversationId'] as string | undefined;
        if (!cid) break;
        broadcastConversation(
          cid,
          {
            type: 'typing',
            conversationId: cid,
            senderType: meta.kind === 'agent' ? 'agent' : 'contact',
            senderId: meta.kind === 'agent' ? meta.userId : meta.contactId,
          },
          ws
        );
        break;
      }
    }
  });

  ws.on('close', async () => {
    rooms.leaveAll(ws);
    const meta = clientMeta.get(ws);
    if (meta?.kind === 'agent') {
      await setAvailability(meta.userId, meta.accountId, 'offline');
      broadcastAccount(meta.accountId, {
        type: 'presence_updated',
        userId: meta.userId,
        availability: 'offline',
      });
    }
    clientMeta.delete(ws);
  });

  ws.on('error', () => rooms.leaveAll(ws));
});

async function startRedis() {
  await Promise.all([publisher.connect(), subscriber.connect()]);
  await subscriber.psubscribe('account:*', 'conversation:*');
  subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
    rooms.broadcast(channel, message);
  });
  console.log('[redis] pub/sub connected');
}

startRedis().catch((err: Error) => console.error('[redis] failed to connect:', err.message));

server.listen(env.WS_PORT, () => {
  console.log(`🔌 FlowChat WS running on port ${env.WS_PORT}`);
});
