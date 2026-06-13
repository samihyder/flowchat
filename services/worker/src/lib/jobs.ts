export async function runWorkerMarketingJobs(): Promise<unknown> {
  const base = process.env.WEB_APP_URL ?? process.env.NEXT_PUBLIC_WEB_APP_URL;
  if (!base) throw new Error('WEB_APP_URL not set');
  const res = await fetch(`${base.replace(/\/$/, '')}/api/cron/marketing`, {
    headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
  if (!res.ok) throw new Error(`Marketing cron failed: ${res.status}`);
  return res.json();
}
