import { PRODUCTION_WS_URL } from '@/lib/config';

/** Public web app URL — include subpath if used (e.g. https://www.digitalbrandcast.com/FlowChat). */
export const PRODUCTION_WEB_URL =
  process.env.NEXT_PUBLIC_WEB_APP_URL ??
  process.env.WEB_APP_URL ??
  'https://flowchat-web-ten.vercel.app';

export const WIDGET_SCRIPT_VERSION = 9;

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
