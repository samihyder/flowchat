# FlowChat — Infrastructure & Setup Reference

> All credentials, project IDs, and connection details for the FlowChat platform.

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
| `NEXT_PUBLIC_API_URL` | API deployment URL |

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
| Web app (Next.js) | http://localhost:3000 | `pnpm --filter @flowchat/web dev` |
| API (Hono/Bun) | http://localhost:3001 | `pnpm --filter @flowchat/api dev` |
| All together | — | `pnpm dev` |

### API endpoints (Sprint 1)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/sign-up` | — | Create user + workspace |
| POST | `/auth/sign-in` | — | Sign in, returns session token |
| POST | `/auth/sign-out` | Bearer token | Invalidate session |
| GET | `/auth/me` | Bearer token | Current user info |

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

---

## Environment Variables Reference

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | API, DB | Neon PostgreSQL connection string |
| `JWT_SECRET` | API | Min 32-char secret for session tokens |
| `PORT` | API | API server port (default: 3001) |
| `NODE_ENV` | API | `development` / `production` / `test` |
| `CORS_ORIGIN` | API | Allowed origin for CORS (web app URL) |
| `NEXT_PUBLIC_API_URL` | Web | Full URL of the API service |

---

## Sprint 1 Completion Status

| Story | Status |
|---|---|
| S1-1 Turborepo monorepo setup | ✅ Done |
| S1-2 Hono API service + health check | ✅ Done |
| S1-3 Drizzle schema — accounts, users, account_users, sessions | ✅ Done |
| S1-4 Auth — sign-up, sign-in, sign-out, session tokens (argon2) | ✅ Done |
| S1-5 Google OAuth 2.0 | 🔜 Sprint 1 carry-over |
| S1-6 Next.js app shell — sign-in, sign-up, dashboard | ✅ Done |
| S1-7 GitHub Actions CI pipeline | ✅ Done |
| S1-8 Environment config with Zod validation | ✅ Done |
| S1-9 Neon DB provisioned + migrations applied | ✅ Done |

---

*Last updated: 2026-06-01*
