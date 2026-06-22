export async function runWorkerMarketingJobs(): Promise<unknown> {
  const base = (process.env.WEB_APP_URL ?? process.env.NEXT_PUBLIC_WEB_APP_URL ?? '').replace(/\/$/, '');
  if (!base) throw new Error('WEB_APP_URL not set');
  const subpath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '/FlowChat').replace(/\/$/, '');
  const cronPath = base.endsWith(subpath) ? `${base}/api/cron/marketing` : `${base}${subpath}/api/cron/marketing`;
  const res = await fetch(cronPath, {
    headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
  if (!res.ok) throw new Error(`Marketing cron failed: ${res.status}`);
  return res.json();
}
