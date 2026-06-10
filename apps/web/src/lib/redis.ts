import { Redis } from 'ioredis';

/** Redis pub/sub for real-time WebSocket delivery (reuses connection across warm invocations). */
let publisher: Redis | null = null;
let connectPromise: Promise<void> | null = null;

function getRedisPublisher(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!publisher) {
    publisher = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    publisher.on('error', (err: Error) => {
      console.error('[redis] publisher error:', err.message);
    });
    connectPromise = publisher.connect().catch((err: Error) => {
      console.error('[redis] publisher connect failed:', err.message);
      publisher = null;
      connectPromise = null;
    }) as Promise<void>;
  }
  return publisher;
}

export async function publishEvent(channel: string, payload: object) {
  const redis = getRedisPublisher();
  if (!redis) {
    console.error('[redis] REDIS_URL not set — real-time delivery disabled');
    return;
  }

  try {
    if (connectPromise) await connectPromise;
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.warn('[redis] publish failed:', err instanceof Error ? err.message : err);
    publisher = null;
    connectPromise = null;
  }
}
