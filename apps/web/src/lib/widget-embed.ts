import { PRODUCTION_WS_URL } from '@/lib/config';

/** Public web app URL — include subpath if used (e.g. https://www.digitalbrandcast.com/FlowChat). */
export const PRODUCTION_WEB_URL =
  process.env.NEXT_PUBLIC_WEB_APP_URL ??
  process.env.WEB_APP_URL ??
  'https://flowchat-web-ten.vercel.app';

export const WIDGET_SCRIPT_VERSION = 10;
export const HEADLESS_SCRIPT_VERSION = 1;

export type WidgetEmbedMode = 'hosted' | 'headless';

export function buildWidgetEmbedSnippet(inboxId: string, webUrl = PRODUCTION_WEB_URL) {
  const appRoot = webUrl.replace(/\/$/, '');
  const apiUrl = `${appRoot}/api`;
  return `<!-- FlowChat Widget — paste before </body> -->
<script>
  window.flowchat = {
    inboxId: "${inboxId}",
    apiUrl: "${apiUrl}",
    configUrl: "${apiUrl}",
    wsUrl: "${PRODUCTION_WS_URL}"
  };
</script>
<script src="${appRoot}/widget.js?v=${WIDGET_SCRIPT_VERSION}" async></script>`;
}

/** Connectivity-only embed — no FlowChat UI; build your own chat interface. */
export function buildHeadlessEmbedSnippet(inboxId: string, webUrl = PRODUCTION_WEB_URL) {
  const appRoot = webUrl.replace(/\/$/, '');
  const apiUrl = `${appRoot}/api`;
  return `<!-- FlowChat Headless — paste before </body> -->
<script src="${appRoot}/headless.js?v=${HEADLESS_SCRIPT_VERSION}"></script>
<script>
  const client = FlowChat.createClient({
    inboxId: "${inboxId}",
    apiUrl: "${apiUrl}",
    configUrl: "${apiUrl}",
    wsUrl: "${PRODUCTION_WS_URL}"
  });

  // Optional: resume a prior visitor session
  client.restore();
  client.trackVisit();

  // Example — wire these to your own UI
  // await client.startSession({ name: "Visitor", email: "you@example.com" });
  // client.on("message", (msg) => console.log("new message", msg));
  // client.connect();
  // await client.sendMessage("Hello");
  window.flowchatClient = client;
</script>`;
}

export function buildEmbedSnippet(
  inboxId: string,
  mode: WidgetEmbedMode = 'hosted',
  webUrl = PRODUCTION_WEB_URL
) {
  return mode === 'headless'
    ? buildHeadlessEmbedSnippet(inboxId, webUrl)
    : buildWidgetEmbedSnippet(inboxId, webUrl);
}
