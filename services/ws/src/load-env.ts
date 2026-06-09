import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(dir, '../../../.env') });

process.env.WS_PORT ??= '3002';
process.env.REDIS_URL ??= 'redis://localhost:6379';
