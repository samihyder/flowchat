# Production deploy

## One-command deploy (local)

Uses `.env` for secrets (never commit `.env` or `Logins.rtf`).

```bash
./scripts/deploy-production.sh
```

This script:

1. Applies migration `0018` if needed (BYOK credentials)
2. Syncs Vercel production env vars from `.env`
3. Runs a production build
4. Deploys to **flowchat-web** on Vercel

## GitHub Actions (optional)

Workflow: `.github/workflows/deploy-production.yml`  
Triggers: push to `main` (apps/web changes) or manual **workflow_dispatch**.

Add these **GitHub repository secrets**:

| Secret | Where to get it |
|--------|-----------------|
| `DATABASE_URL` | Neon pooler connection string |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `vercel project ls` or team settings |
| `VERCEL_PROJECT_ID` | `apps/web/.vercel/project.json` → `projectId` |

## Subpath (digitalbrandcast.com/FlowChat)

Set in `.env` before deploy:

```
NEXT_PUBLIC_BASE_PATH=/FlowChat
NEXT_PUBLIC_WEB_APP_URL=https://www.digitalbrandcast.com/FlowChat
WEB_APP_URL=https://www.digitalbrandcast.com/FlowChat
```

Proxy `/FlowChat` on the main site → Vercel. See [SUBPATH_DEPLOYMENT.md](../docs/SUBPATH_DEPLOYMENT.md).

## Live URLs after deploy

| URL |
|-----|
| `https://flowchat-web-ten.vercel.app/FlowChat/sign-in` |
| `https://www.digitalbrandcast.com/FlowChat/sign-in` (after DNS/proxy) |
