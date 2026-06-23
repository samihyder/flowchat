# FlowChat — Infrastructure & Setup Reference

> All credentials, project IDs, connection details, and deployment topology for the FlowChat platform.

---

## Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Vercel                          Railway                                │
│  ┌──────────────┐                ┌──────────────┐  ┌──────────────┐     │
│  │  apps/web    │──REST────────▶│ services/api │  │ services/ws  │     │
│  │  (Next.js)   │                │   (Hono)     │  │ (WebSocket)  │     │
│  └──────┬───────┘                └──────┬───────┘  └──────┬───────┘     │
│         │ WebSocket                     │                   │             │
│         └───────────────────────────────┼───────────────────┘             │
│                                         │                                 │
│                                         ▼                                 │
│                              ┌──────────────────┐                         │
│                              │  Neon PostgreSQL │  (shared DB)            │
│                              └──────────────────┘                         │
│                                         ▲                                 │
│                              ┌──────────────────┐                         │
│                              │  Railway Redis   │  (pub/sub + presence)   │
│                              └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

| Component | Host | Repo path | Purpose |
|---|---|---|---|
| **Web app** | [Vercel](https://vercel.com) | `apps/web` | Dashboard UI, auth pages, settings |
| **API** | [Railway](https://railway.com) | `services/api` | REST API — auth, accounts, inboxes, teams |
| **WebSocket** | [Railway](https://railway.com) | `services/ws` | Real-time presence, future message delivery |
| **PostgreSQL** | [Neon](https://neon.tech) | — | Primary database (API + WS read sessions) |
| **Redis** | Railway (Redis plugin) | — | WS pub/sub backbone, agent presence TTL |

### Production URLs (fill in after deploy)

| Service | URL | Notes |
|---|---|---|
| Web (Vercel) | `https://<your-app>.vercel.app` | Set as `WEB_APP_URL` and `CORS_ORIGIN` on API |
| API (Railway) | `https://<api-service>.up.railway.app` | Set as `NEXT_PUBLIC_API_URL` on Vercel |
| WS (Railway) | `wss://<ws-service>.up.railway.app` | Set as `NEXT_PUBLIC_WS_URL` on Vercel (use `wss://`) |

> `apps/web/railway.json` exists but is **not used** — the web app deploys to Vercel only.

---

## Deployment — Environment Variables by Platform

### Vercel (`apps/web`)

Set in **Project Settings → Environment Variables**:

| Variable | Example | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://flowchat-api.up.railway.app` | Yes |
| `NEXT_PUBLIC_WS_URL` | `wss://flowchat-ws.up.railway.app` | Yes |

Vercel auto-builds from `apps/web` (root directory setting: `apps/web` in monorepo).

### Railway — API service (`services/api`)

Create a Railway service linked to `services/api` as root directory.

| Variable | Source | Required |
|---|---|---|
| `DATABASE_URL` | Neon **pooler** connection string | Yes |
| `JWT_SECRET` | Generate 32+ random chars | Yes |
| `NODE_ENV` | `production` | Yes |
| `CORS_ORIGIN` | Vercel URL (comma-separate preview URLs if needed) | Yes |
| `WEB_APP_URL` | Vercel production URL | Yes |
| `API_PUBLIC_URL` | This Railway service public URL | Yes |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Optional |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Optional |
| `R2_*` | Cloudflare R2 | Optional (logo upload) |

Railway sets `PORT` automatically — do not hardcode.

**Google OAuth redirect URI (production):**
```
https://<api-service>.up.railway.app/auth/google/callback
```

### Railway — WebSocket service (`services/ws`)

Create a separate Railway service linked to `services/ws` as root directory.

| Variable | Source | Required |
|---|---|---|
| `DATABASE_URL` | Same Neon pooler URL as API | Yes |
| `REDIS_URL` | Railway Redis plugin → `${{Redis.REDIS_URL}}` | Yes |
| `NODE_ENV` | `production` | Yes |
| `WS_PORT` | Railway sets via `PORT` — map if needed | Auto |

> Railway injects `PORT`. The WS service reads `WS_PORT` first, then falls back to `PORT`.

**Link Redis to WS:** In Railway, add a Redis database to the project and reference its `REDIS_URL` in the WS service variables.

### Neon PostgreSQL

Use the **pooler** connection string on Railway (serverless-friendly):

```
postgresql://neondb_owner:<password>@ep-damp-flower-aky5elgr-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require
```

Both API and WS services connect to the same Neon database.

---

## Neon PostgreSQL (Database)

| Property | Value |
|---|---|
| Provider | [Neon](https://neon.tech) (Serverless PostgreSQL) |
| Project name | `flowchat` |
| Project ID | `billowing-lake-84120582` |
| Region | `aws-us-west-2` (US West — Oregon) |
| PostgreSQL version | 17 |
| Organisation | `@mutexsystemsltd` (`org-weathered-water-71329950`) |
| Host | `ep-damp-flower-aky5elgr.c-3.us-west-2.aws.neon.tech` |
| Pooler host | `ep-damp-flower-aky5elgr-pooler.c-3.us-west-2.aws.neon.tech` |
| Database | `neondb` |
| Role | `neondb_owner` |
| Dashboard | https://console.neon.tech/app/projects/billowing-lake-84120582 |

### Connection string (store in `.env` as `DATABASE_URL`)
```
postgresql://neondb_owner:<password>@ep-damp-flower-aky5elgr.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require
```

> Password is stored only in `.env` (gitignored). Retrieve from Neon dashboard → Connection Details if needed.

### Pooler connection string (use in production / serverless deployments)
```
postgresql://neondb_owner:<password>@ep-damp-flower-aky5elgr-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require
```

---

## Database Schema

Tables created by migration `drizzle/0000_concerned_speedball.sql`:

| Table | Columns | Purpose |
|---|---|---|
| `accounts` | id, name, slug, domain, logo_url, timezone, locale, status, settings, limits, created_at, updated_at | Workspaces / tenants |
| `users` | id, name, email, password_hash, avatar_url, email_verified_at, totp_secret, totp_enabled_at, backup_codes, google_id, is_active, last_active_at, created_at, updated_at | All platform users |
| `account_users` | account_id, user_id, role, availability, display_name, created_at, updated_at | Agent ↔ Workspace membership with role |
| `sessions` | id, user_id, token, expires_at, created_at | Auth sessions (30-day TTL) |

### Enums
- `account_status`: `active` | `suspended` | `trial`
- `agent_role`: `administrator` | `agent`
- `availability_status`: `online` | `busy` | `offline`

---

## GitHub Repository

| Property | Value |
|---|---|
| Repo | https://github.com/samihyder/flowchat |
| Visibility | Public |
| Default branch | `main` |
| CI | GitHub Actions — `.github/workflows/ci.yml` |

### Required GitHub Secrets (Settings → Secrets → Actions)
| Secret | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (pooler URL for CI) |
| `JWT_SECRET` | 32+ char random hex string |
| `NEXT_PUBLIC_API_URL` | Railway API deployment URL |

### Railway project structure (recommended)

```
Railway Project: flowchat
├── api          → services/api   (Neon DATABASE_URL, JWT_SECRET, CORS_ORIGIN)
├── ws           → services/ws    (Neon DATABASE_URL, REDIS_URL from Redis plugin)
└── Redis        → Railway Redis plugin (shared by ws service)
```

Web app is **not** on Railway — it deploys from the same repo to **Vercel** with root directory `apps/web`.

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- pnpm 11+
- Bun 1.3+
- Neon CLI (`npm i -g neonctl`)

### First-time setup
```bash
# 1. Clone
git clone https://github.com/samihyder/flowchat
cd flowchat

# 2. Install dependencies
pnpm install

# 3. Create .env (fill in DATABASE_URL + JWT_SECRET)
cp .env.example .env

# 4. Run DB migrations
pnpm --filter @flowchat/db db:migrate

# 5. Start all services
pnpm dev
```

### Running services
| Service | URL | Command |
|---|---|---|
| Web app (Next.js) | http://localhost:3100 | `pnpm --filter @flowchat/web dev` |
| API (Hono/Bun) | http://localhost:3001 | `pnpm --filter @flowchat/api dev` |
| All together | — | `pnpm dev` |

### API endpoints

#### Auth (Sprint 1)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/sign-up` | — | Create user + workspace |
| POST | `/auth/sign-in` | — | Sign in, returns session or MFA challenge |
| POST | `/auth/sign-out` | Bearer token | Invalidate session |
| GET | `/auth/me` | Bearer token | Current user info + MFA status |
| GET | `/auth/google` | — | Redirect to Google OAuth (optional) |
| GET | `/auth/google/callback` | — | OAuth callback → web app |

#### MFA (Sprint 2)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/2fa/setup` | Bearer token | TOTP secret + QR URI |
| POST | `/auth/2fa/enable` | Bearer token | Verify code, enable 2FA, return backup codes |
| POST | `/auth/2fa/disable` | Bearer token | Disable 2FA with TOTP or backup code |
| POST | `/auth/2fa/verify` | — | Complete sign-in after MFA challenge |

#### Account & teams (Sprint 2)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET/PATCH | `/accounts/:id` | Bearer + member | Account settings |
| POST | `/accounts/:id/logo-upload-url` | Bearer + admin | R2 presigned upload URL |
| CRUD | `/accounts/:id/agents` | Bearer + admin | Agent management |
| CRUD | `/accounts/:id/teams` | Bearer + admin | Team management |
| CRUD | `/accounts/:id/inboxes` | Bearer + member | Inbox management |

---

## DB Management Commands

```bash
# Generate new migration after schema change
pnpm --filter @flowchat/db db:generate

# Apply migrations to Neon
pnpm --filter @flowchat/db db:migrate

# Push schema directly (dev only — no migration file)
pnpm --filter @flowchat/db db:push

# Open Drizzle Studio (visual DB browser)
pnpm db:studio
```

### Recent migrations (CRM companies & enrichment)

| Migration | Purpose |
|---|---|
| `0019_global_companies.sql` | Global `companies` table; `contacts.company_id` FK |
| `0020_enrichment_providers.sql` | `data_enrichment` credential category + provider metadata |
| `0021_contact_enrichment_suggestions.sql` | Staged field-level enrichment proposals |

Production deploy applies these via `scripts/deploy-production.sh` when tables are missing.

---

## Environment Variables Reference

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | API, WS, DB migrations | Neon PostgreSQL connection string |
| `JWT_SECRET` | API | Min 32-char secret for session tokens |
| `PORT` | API | API server port (Railway sets in prod) |
| `WS_PORT` | WS | WebSocket port (defaults 3002 locally; Railway uses `PORT`) |
| `REDIS_URL` | WS | Railway Redis connection string |
| `NODE_ENV` | API, WS | `development` / `production` / `test` |
| `CORS_ORIGIN` | API | Vercel URL(s), comma-separated for previews |
| `WEB_APP_URL` | API | Vercel web app URL (OAuth redirects) |
| `API_PUBLIC_URL` | API | Railway API public URL (OAuth callback base) |
| `GOOGLE_CLIENT_ID` | API | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | API | Google OAuth client secret (optional) |
| `NEXT_PUBLIC_API_URL` | Web (Vercel) | Railway API public URL |
| `NEXT_PUBLIC_WS_URL` | Web (Vercel) | Railway WS public URL (`wss://` in prod) |
| `R2_*` | API, Web (Vercel) | Cloudflare R2 credentials for logo upload (optional) |

### R2 CORS (required for large logo / attachment uploads)

Browser uploads use a presigned PUT directly to R2. Add this CORS policy on the bucket (Cloudflare dashboard → R2 → bucket → Settings → CORS):

```json
[
  {
    "AllowedOrigins": [
      "https://www.digitalbrandcast.com",
      "http://localhost:3100"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Logos **≤ 4 MB** upload through the Next.js API (`POST /api/accounts/:id/logo`) and do not need CORS. Larger files (up to 10 MB) use presigned upload and require the policy above.

---

## Sprint 1 Completion Status

| Story | Status |
|---|---|
| S1-1 Turborepo monorepo setup | ✅ Done |
| S1-2 Hono API service + health check | ✅ Done |
| S1-3 Drizzle schema — accounts, users, account_users, sessions | ✅ Done |
| S1-4 Auth — sign-up, sign-in, sign-out, session tokens (argon2) | ✅ Done |
| S1-5 Google OAuth 2.0 (Arctic) | ✅ Done (optional — requires env vars) |
| S1-6 Next.js app shell — sign-in, sign-up, dashboard, middleware | ✅ Done |
| S1-7 GitHub Actions CI — typecheck, lint, Vitest, build | ✅ Done |
| S1-8 Environment config with Zod validation | ✅ Done |
| S1-9 Neon DB provisioned + migrations applied | ✅ Done |

## Sprint 2 Completion Status

| Story | Status |
|---|---|
| S2-1 Schema — inboxes, inbox_members, teams, team_members | ✅ Done |
| S2-2 Agent management — invite, roles, deactivate | ✅ Done |
| S2-3 Team management — CRUD + members | ✅ Done |
| S2-4 WebSocket service — Redis pub/sub | ✅ Done |
| S2-5 Agent availability — online/busy/offline | ✅ Done |
| S2-6 Dashboard sidebar — inboxes, teams, presence | ✅ Done (unread counts ship with Sprint 3) |
| S2-7 Account settings — name, timezone, locale, R2 logo (512×512px, max 10 MB) | ✅ Done |
| S2-8 Two-factor authentication — TOTP + backup codes | ✅ Done |

### Sprint 2 extras completed
- `/settings/inboxes` — create, list, delete, embed code preview
- Session cookie sync for Next.js middleware
- Google OAuth + 2FA challenge on OAuth sign-in

## Sprint 3 Completion Status

| Story | Status |
|---|---|
| S3-1 Schema — contacts, contact_inboxes, conversations, messages | ✅ Done |
| S3-2 Web widget — chat bubble, pre-chat form, open/close animation | ✅ Done (`apps/web/public/widget.js`) |
| S3-3 Widget → API — create contact + conversation on session start | ✅ Done |
| S3-4 Widget ↔ WS — real-time message delivery both directions | ✅ Done |
| S3-5 Inbox settings — embed code with apiUrl + wsUrl | ✅ Done |
| S3-6 Conversation list — open conversations, unread, last preview | ✅ Done |
| S3-7 Conversation thread — message history, reply composer | ✅ Done |

### Sprint 3 API routes

| Method | Path | Auth |
|---|---|---|
| GET | `/public/inboxes/:inboxId/widget-config` | Public (CORS *) |
| POST | `/public/inboxes/:inboxId/sessions` | Public |
| GET/POST | `/public/conversations/:id/messages` | `X-Visitor-Token` |
| GET | `/accounts/:accountId/conversations` | Bearer |
| GET/PATCH | `/accounts/:accountId/conversations/:id` | Bearer |
| GET/POST | `/accounts/:accountId/conversations/:id/messages` | Bearer |

### Sprint 3 local test

1. Apply migration: `pnpm db:migrate` (requires `DATABASE_URL` in root `.env`)
2. Run API, WS, and web: `pnpm dev`
3. Create a web widget inbox in Settings → Inboxes → copy embed code
4. Open `/test-widget.html`, replace inbox ID, send a message from the widget
5. Open `/dashboard` as an agent — conversation appears; reply delivers to widget in real time

---

*Last updated: 2026-06-05*
