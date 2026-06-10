/** Optional Redis pub/sub for real-time WebSocket delivery. */
export async function publishEvent(channel: string, payload: object) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await client.connect();
    await client.publish(channel, JSON.stringify(payload));
    client.disconnect();
  } catch (err) {
    console.warn('[redis] publish failed:', err instanceof Error ? err.message : err);
  }
}
