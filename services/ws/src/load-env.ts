import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(dir, '../../../.env') });

// Prefer Railway's injected PORT so healthchecks hit the listening socket.
process.env.WS_PORT ??= process.env.PORT ?? '3002';
process.env.REDIS_URL ??= 'redis://localhost:6379';
