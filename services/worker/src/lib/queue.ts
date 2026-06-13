import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'flowchat-marketing';

function getConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function startMarketingWorker(handler: (job: Job) => Promise<void>): Worker | null {
  const connection = getConnection();
  if (!connection) return null;
  return new Worker(QUEUE_NAME, handler, {
    connection,
    concurrency: Number(process.env.MARKETING_WORKER_CONCURRENCY ?? 2),
  });
}

export async function scheduleMarketingRepeatable(): Promise<void> {
  const connection = getConnection();
  if (!connection) return;
  const q = new Queue(QUEUE_NAME, { connection });
  await q.add('tick', {}, { repeat: { every: 60_000 }, jobId: 'marketing-tick' });
}
