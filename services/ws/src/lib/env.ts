import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  WS_PORT: z.coerce.number().optional(),
  PORT: z.coerce.number().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const WS_PORT =
  parsed.data.WS_PORT ??
  parsed.data.PORT ??
  (process.env.RAILWAY_ENVIRONMENT && process.env.PORT
    ? Number(process.env.PORT)
    : 3002);

export const env = { ...parsed.data, WS_PORT };
