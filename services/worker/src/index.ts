import './load-env.js';
import { createServer } from 'node:http';
import { startMarketingWorker, scheduleMarketingRepeatable } from './lib/queue.js';
import { runWorkerMarketingJobs } from './lib/jobs.js';

const port = Number(process.env.PORT ?? 8082);
let workerReady = false;
let workerError: string | null = null;

const server = createServer((req, res) => {
  const path = req.url?.split('?')[0];
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: workerReady ? 'ok' : workerError ? 'degraded' : 'starting',
        queue: 'flowchat-marketing',
        worker: workerReady,
        error: workerError,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[worker] health server listening on 0.0.0.0:${port}`);
  void initWorker();
});

async function initWorker(): Promise<void> {
  try {
    if (!process.env.REDIS_URL) {
      workerError = 'REDIS_URL not set';
      console.error(`[worker] ${workerError}`);
      return;
    }

    const worker = startMarketingWorker(async () => {
      await runWorkerMarketingJobs();
    });
    if (!worker) {
      workerError = 'Failed to start BullMQ worker';
      console.error(`[worker] ${workerError}`);
      return;
    }

    worker.on('failed', (job, err) => {
      console.error('[worker] job failed', job?.id, err);
    });

    await scheduleMarketingRepeatable();
    workerReady = true;
    console.log('[worker] marketing queue ready');
  } catch (err) {
    workerError = err instanceof Error ? err.message : String(err);
    console.error('[worker] init failed:', workerError);
  }
}
