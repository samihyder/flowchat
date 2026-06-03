import Redis from 'ioredis';
import { env } from './env.js';

export const publisher = new Redis(env.REDIS_URL, { lazyConnect: true });
export const subscriber = new Redis(env.REDIS_URL, { lazyConnect: true });

publisher.on('error', (err) => console.error('[redis:publisher]', err.message));
subscriber.on('error', (err) => console.error('[redis:subscriber]', err.message));
