export function getWebAppOrigin(): string {
  // `||` (not `??`) on purpose: these env vars have shipped set to an empty string in at
  // least one deployment, which `??` treats as "present" and silently produces a hostless
  // origin — breaking every link built from it (invite emails, widget embeds, unsubscribe
  // links, webhook URLs).
  return (
    process.env.WEB_APP_URL ||
    process.env.NEXT_PUBLIC_WEB_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3100')
  ).replace(/\/$/, '');
}
