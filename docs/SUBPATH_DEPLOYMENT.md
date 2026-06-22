# FlowChat on a subpath (e.g. www.digitalbrandcast.com/FlowChat)

Use this when FlowChat lives **under** your main marketing site instead of its own subdomain.

---

## URLs when configured

| Resource | URL |
|----------|-----|
| App (sign-in) | `https://www.digitalbrandcast.com/FlowChat/sign-in` |
| Dashboard | `https://www.digitalbrandcast.com/FlowChat/dashboard` |
| API | `https://www.digitalbrandcast.com/FlowChat/api/...` |
| Widget script | `https://www.digitalbrandcast.com/FlowChat/widget.js` |

---

## 1. Vercel env vars (FlowChat project)

Set these on the **FlowChat** Vercel project, then **redeploy** (basePath is baked at build time):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/FlowChat` |
| `NEXT_PUBLIC_WEB_APP_URL` | `https://www.digitalbrandcast.com/FlowChat` |
| `WEB_APP_URL` | `https://www.digitalbrandcast.com/FlowChat` |

Keep all other production vars (`DATABASE_URL`, `REDIS_URL`, `CREDENTIALS_ENCRYPTION_KEY`, etc.) as before.

**Railway API** — add to `CORS_ORIGIN` (comma-separated if needed):

```
https://www.digitalbrandcast.com
```

---

## 2. Route traffic to FlowChat

Your **main site** (`www.digitalbrandcast.com`) must forward `/FlowChat` to the FlowChat deployment.

### Option A — Main site also on Vercel

In the **digitalbrandcast** project `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/FlowChat",
      "destination": "https://flowchat-web-ten.vercel.app/FlowChat"
    },
    {
      "source": "/FlowChat/:path*",
      "destination": "https://flowchat-web-ten.vercel.app/FlowChat/:path*"
    }
  ]
}
```

Replace `flowchat-web-ten.vercel.app` with your FlowChat Vercel URL.

### Option B — Cloudflare (or nginx)

Proxy `/FlowChat` to the FlowChat Vercel app:

```
https://www.digitalbrandcast.com/FlowChat/*
  → https://flowchat-web-ten.vercel.app/FlowChat/*
```

### Option C — Custom domain on FlowChat project only

If **the entire domain** is dedicated to FlowChat (no separate marketing site on `/`), add `www.digitalbrandcast.com` as a custom domain on the FlowChat Vercel project and keep `NEXT_PUBLIC_BASE_PATH=/FlowChat`. Visitors use `www.digitalbrandcast.com/FlowChat/...`; the site root `/` can redirect to `/FlowChat` in your host config.

---

## 3. Inbox widget allowlist

**Settings → Inboxes → Domain allowlist** must include sites that embed the widget, e.g.:

- `www.digitalbrandcast.com`
- `digitalbrandcast.com`

---

## 4. Widget embed snippet

After deploy, embed codes in **Settings → Inboxes** will use `NEXT_PUBLIC_WEB_APP_URL`:

```html
<script>
  window.flowchat = {
    inboxId: "…",
    apiUrl: "https://www.digitalbrandcast.com/FlowChat/api",
    configUrl: "https://www.digitalbrandcast.com/FlowChat/api",
    wsUrl: "wss://flowchat-ws-production.up.railway.app"
  };
</script>
<script src="https://www.digitalbrandcast.com/FlowChat/widget.js?v=9" async></script>
```

---

## 5. Verify

1. Open `https://www.digitalbrandcast.com/FlowChat/sign-in`
2. Sign in → dashboard loads under `/FlowChat/dashboard`
3. Widget on your site loads and sends a test message
4. Agent dashboard receives it (WebSocket + Redis)

---

## Local dev with subpath (optional)

```bash
NEXT_PUBLIC_BASE_PATH=/FlowChat \
NEXT_PUBLIC_WEB_APP_URL=http://localhost:3100/FlowChat \
pnpm --filter @flowchat/web dev
```

App: `http://localhost:3100/FlowChat/dashboard`

---

## Rollback to root deploy

Remove `NEXT_PUBLIC_BASE_PATH` (or set empty), set `WEB_APP_URL` back to `https://flowchat-web-ten.vercel.app`, redeploy.
