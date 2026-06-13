import './load-env.js';
import { createServer } from 'node:http';
import { startMarketingWorker, scheduleMarketingRepeatable } from './lib/queue.js';
import { runWorkerMarketingJobs } from './lib/jobs.js';

const worker = startMarketingWorker(async () => {
  await runWorkerMarketingJobs();
});

if (!worker) {
  console.error('[worker] REDIS_URL not set — marketing worker disabled');
  process.exit(1);
}

void scheduleMarketingRepeatable();

const port = Number(process.env.PORT ?? 8082);
createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', queue: 'flowchat-marketing' }));
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(port, () => {
  console.log(`[worker] marketing BullMQ worker listening on :${port}`);
});
