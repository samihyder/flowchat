import { Redis } from 'ioredis';
import { env } from './env.js';

let publisher: Redis | null = null;

export function getRedisPublisher() {
  if (!env.REDIS_URL) return null;
  if (!publisher) {
    publisher = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    publisher.connect().catch((err: Error) => {
      console.warn('[redis] publisher connect failed:', err.message);
    });
  }
  return publisher;
}

export async function publishEvent(channel: string, payload: object) {
  const redis = getRedisPublisher();
  if (!redis) return;
  try {
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.warn('[redis] publish failed:', (err as Error).message);
  }
}
