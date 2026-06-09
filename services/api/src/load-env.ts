import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(dir, '../../../.env') });

if (process.env.NODE_ENV !== 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'flowchat-dev-jwt-secret-min-32-chars';
  }
}
