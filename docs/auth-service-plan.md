# FlowAuth — Authentication & MFA as a Service

> Plan for extracting FlowChat's auth layer into a standalone, multi-tenant identity product that FlowChat consumes first, then sells to external customers.

**Status:** Proposed · **Last updated:** 2026-06-05  
**First consumer:** FlowChat (`apps/web`, `services/api`, `services/ws`)  
**Working name:** FlowAuth (rename before external launch)

---

## 1. Why separate auth?

FlowChat already has email/password sessions, TOTP 2FA (in progress), and schema hooks for Google OAuth. Keeping this embedded in `services/api` blocks three goals:

| Goal | Problem with embedded auth | Benefit of FlowAuth |
|---|---|---|
| Ship FlowChat faster | Auth changes risk inbox/conversation APIs | Auth evolves independently |
| Sell MFA to other products | No tenant model, no API keys, no docs | Multi-tenant SaaS from day one |
| Enterprise readiness | No org-level MFA policy, no audit trail | Policy engine + audit log built in |

FlowAuth is **not** a replacement for FlowChat's `accounts` (workspaces). It owns **identity** (who is this person?). FlowChat owns **authorization** (what can they do in this workspace?).

---

## 2. Product scope

### MVP (FlowChat + 1 external pilot)

- Email/password registration and sign-in
- Opaque session tokens (30-day TTL, revocable)
- TOTP MFA — enrol, verify, backup codes, disable
- MFA challenge during sign-in (`requiresTwoFactor` → `/mfa/verify`)
- Session introspection endpoint for downstream services
- Per-application API keys (server-to-server)
- Audit log for security events

### V1 (sellable SaaS)

- Google OAuth 2.0 (+ Apple/GitHub later)
- Organization-level MFA policies (optional / required / admin-only)
- WebAuthn / passkeys
- Email magic links
- Hosted login + MFA UI (optional embed)
- Developer dashboard — apps, keys, webhooks, usage
- Rate limiting + abuse protection
- SAML/OIDC for enterprise (Phase 2)

### Out of scope (initially)

- FlowChat workspace/team/inbox permissions (stays in `services/api`)
- End-customer (visitor) auth for the chat widget (separate anonymous/contact identity in Sprint 3)
- Billing UI (metering hooks only in V1)

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     External customers                          │
│   Their apps ──► @flowauth/sdk (JS) ──► FlowAuth API            │
└─────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────┐
│              FlowChat monorepo    │                             │
│                                   ▼                             │
│  apps/web ──► @flowauth/sdk ──► services/auth (FlowAuth)        │
│  services/api ──► validate session via SDK / introspect         │
│  services/ws  ──► validate session via SDK / introspect         │
│                                   │                             │
│                                   ▼                             │
│                          packages/auth-db (Neon)                │
│                          Redis (MFA challenges, rate limits)    │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo layout (target)

```
services/
  auth/                 # FlowAuth API (Hono + Node/Bun)
  api/                  # FlowChat product API (drops embedded auth routes)
  ws/

packages/
  auth-db/              # Drizzle schema: orgs, apps, users, sessions, mfa, audit
  auth-sdk/             # TS client: signIn, mfa, validateSession, middleware
  auth-types/           # Shared Zod schemas + response types
  db/                   # FlowChat product schema (accounts, inboxes, …)
  types/                # FlowChat product types
```

### Service boundaries

| Concern | FlowAuth (`services/auth`) | FlowChat API (`services/api`) |
|---|---|---|
| User identity | `auth_users` (email, password, MFA) | References `auth_user_id` |
| Sessions | Creates, validates, revokes | Calls introspect; never stores sessions |
| MFA / TOTP | Full lifecycle | None |
| OAuth | Provider linking | None |
| Workspaces | None | `accounts`, `account_users`, roles |
| Product data | None | inboxes, conversations, teams |

### Token flow

1. **Browser → FlowAuth:** sign-in returns `{ token, expiresAt, user }` or `{ requiresMfa, mfaToken }`.
2. **Browser → FlowChat API:** `Authorization: Bearer <token>` on every request.
3. **FlowChat API → FlowAuth:** `POST /v1/sessions/introspect` with app secret + token → `{ valid, userId, … }`.
4. **FlowChat API:** maps `userId` → `account_users` for workspace authorization.

Use short-lived introspect cache (Redis, 30–60 s) in API/WS to avoid hot-path latency.

---

## 4. Multi-tenant data model (FlowAuth DB)

FlowAuth has its own PostgreSQL database (can share Neon project, separate schema or DB).

```
organizations          # Your paying customers (Mutex clients using FlowAuth)
  └── applications     # Each org's apps (flowchat-prod, flowchat-staging, acme-crm)
        └── api_keys   # sk_live_… server secrets
        └── webhooks   # mfa.enrolled, session.revoked, …

auth_users             # End users per application (email unique per app)
  └── credentials      # password_hash, oauth links
  └── mfa_factors      # totp_secret (encrypted), webauthn keys
  └── backup_codes     # hashed, single-use
  └── sessions         # opaque tokens

mfa_challenges         # Redis: pending sign-in MFA (5 min TTL)
audit_events           # sign_in, mfa_enrolled, mfa_failed, session_revoked, …
mfa_policies           # per-application: off | optional | required
```

### FlowChat bridge table (stays in `packages/db`)

```sql
-- account_users gains:
auth_user_id UUID NOT NULL  -- FK logical link to FlowAuth auth_users.id
```

On FlowChat sign-up, the web app calls FlowAuth first, then FlowChat API creates `accounts` + `account_users` with the returned `auth_user_id`.

---

## 5. API surface (FlowAuth)

Base URL: `https://auth.flowchat.io/v1` (staging: `auth.staging.flowchat.io`)

### Public (browser / mobile SDK)

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create user in application context |
| POST | `/login` | Password check → session or MFA challenge |
| POST | `/mfa/verify` | Complete login after `requiresMfa` |
| POST | `/logout` | Revoke session |
| GET | `/me` | Current user + MFA status |
| GET | `/mfa/setup` | TOTP secret + `otpauth://` URI |
| POST | `/mfa/enable` | Confirm TOTP → backup codes |
| POST | `/mfa/disable` | Disable with TOTP or backup code |
| POST | `/mfa/backup-codes/regenerate` | Admin/user regenerates codes |

### Server (API key required)

| Method | Path | Description |
|---|---|---|
| POST | `/sessions/introspect` | Validate token → user payload |
| DELETE | `/sessions/:id` | Force-revoke (admin) |
| GET | `/users/:id` | Fetch user by ID |
| POST | `/users/:id/mfa/reset` | Admin reset MFA (support) |

### Management (org dashboard, V1)

| Method | Path | Description |
|---|---|---|
| POST | `/orgs` | Create organization |
| POST | `/orgs/:id/apps` | Create application |
| POST | `/apps/:id/keys` | Rotate API keys |
| PATCH | `/apps/:id/mfa-policy` | Set MFA requirement |

All requests include `X-FlowAuth-App-Id` (public) + `Authorization: Bearer sk_…` for server routes.

---

## 6. SDK design (`@flowauth/sdk`)

```typescript
// Browser
import { FlowAuthClient } from '@flowauth/sdk';

const auth = new FlowAuthClient({
  appId: process.env.NEXT_PUBLIC_FLOWAUTH_APP_ID!,
  baseUrl: process.env.NEXT_PUBLIC_FLOWAUTH_URL!,
});

const result = await auth.signIn({ email, password });
if (result.requiresMfa) {
  await auth.verifyMfa({ mfaToken: result.mfaToken, code });
}

// Server middleware (FlowChat API)
import { flowAuthMiddleware } from '@flowauth/sdk/hono';

app.use('/accounts/*', flowAuthMiddleware({
  appSecret: env.FLOWAUTH_APP_SECRET,
  introspectUrl: env.FLOWAUTH_URL,
}));
// c.get('authUserId') available in handlers
```

SDK ships: browser client, Hono middleware, WS auth helper, React hooks (`useSession`, `useMfaEnrol`).

---

## 7. FlowChat integration

### What moves out of `services/api`

| Current file | Destination |
|---|---|
| `routes/auth.ts` | `services/auth/routes/login.ts` |
| `routes/auth-2fa.ts` | `services/auth/routes/mfa.ts` |
| `lib/auth.ts` (sessions) | `services/auth/lib/sessions.ts` |
| `middleware/session.ts` | `packages/auth-sdk/hono.ts` (introspect) |
| `users.totp_*` columns | `auth-db.mfa_factors` |
| `users.password_hash` | `auth-db.credentials` |
| `sessions` table | `auth-db.sessions` |

### What stays in FlowChat

- `accounts`, `account_users`, `inboxes`, `teams`, …
- `account_users.role`, `availability` — product authorization
- Agent invite flow: create user in FlowAuth + link `auth_user_id`

### Environment variables

| Variable | Consumer | Purpose |
|---|---|---|
| `FLOWAUTH_URL` | web, api, ws | Auth service base URL |
| `NEXT_PUBLIC_FLOWAUTH_APP_ID` | web | Public app identifier |
| `FLOWAUTH_APP_SECRET` | api, ws | Server introspection |
| `FLOWAUTH_INTERNAL_URL` | api | Same-region private URL |

### Web app changes

- `apps/web/src/lib/api.ts` → split `auth` and `twoFa` calls to `NEXT_PUBLIC_FLOWAUTH_URL`
- `store/auth.ts` unchanged (still stores token + user)
- `settings/security` page uses `@flowauth/sdk` MFA methods
- Sign-in page MFA challenge unchanged UX, different base URL

---

## 8. Phased delivery (aligned with sprint roadmap)

### Track A — FlowChat product (unchanged priority)

| Sprint | Focus | Auth impact |
|---|---|---|
| **S2 finish** | Commit current 2FA WIP | Interim: 2FA lives in `services/api` (1–2 days) |
| **S3** | Widget + conversations | WS/API validate sessions (embedded or introspect) |
| **S4–6** | Conversation lifecycle | No auth work |

### Track B — FlowAuth extraction (parallel, 3 weeks)

#### Week 1 — Foundation (during S2 wrap-up)

| ID | Story | Pts | Deliverable |
|---|---|---|---|
| FA-1 | Scaffold `services/auth`, `packages/auth-db`, `packages/auth-sdk` | 3 | `pnpm dev` starts auth on `:3002` |
| FA-2 | Schema: `organizations`, `applications`, `api_keys`, `auth_users`, `sessions`, `mfa_factors` | 5 | Migrations applied |
| FA-3 | Port sign-up, sign-in, sign-out, `/me` from current `auth.ts` | 5 | Parity with existing routes |
| FA-4 | Port TOTP enrol, verify, backup codes from `auth-2fa.ts` | 5 | MFA parity |
| FA-5 | `POST /sessions/introspect` + Redis MFA challenge tokens | 3 | Server validation ready |

**Week 1 exit:** FlowAuth runs standalone; curl tests pass.

#### Week 2 — FlowChat cutover (start of S3)

| ID | Story | Pts | Deliverable |
|---|---|---|---|
| FA-6 | `@flowauth/sdk` browser client + Hono middleware | 5 | Drop-in for web + api |
| FA-7 | FlowChat sign-up: FlowAuth register → API create account | 5 | E2E sign-up works |
| FA-8 | FlowChat sign-in + MFA challenge via FlowAuth | 3 | E2E sign-in + 2FA |
| FA-9 | WS + API session validation via introspect | 3 | Real-time auth works |
| FA-10 | Data migration script: existing `users` → FlowAuth `auth_users` | 5 | Staging users migrated |

**Week 2 exit:** FlowChat no longer serves `/auth/*`; embedded routes removed.

#### Week 3 — External-ready (S3 mid-sprint)

| ID | Story | Pts | Deliverable |
|---|---|---|---|
| FA-11 | Seed FlowChat as first `application` + API keys | 2 | Config documented |
| FA-12 | Audit log: `sign_in`, `mfa_enrolled`, `mfa_failed`, `session_revoked` | 3 | `audit_events` table |
| FA-13 | Rate limiting on login + MFA verify (Redis) | 3 | Brute-force protection |
| FA-14 | OpenAPI spec + `docs/flowauth-api.md` | 3 | External dev docs |
| FA-15 | Google OAuth in FlowAuth (absorbs S1-5 carry-over) | 5 | OAuth sign-in |

**Week 3 exit:** Second test application can register users via API key.

### V1 backlog (Phase 6 / post-MVP)

- Hosted login page (`apps/auth-portal`)
- Org dashboard (`apps/auth-admin`)
- MFA policies per application
- WebAuthn / passkeys
- Webhooks
- Usage metering for billing
- SAML/OIDC

---

## 9. Security requirements

| Control | Implementation |
|---|---|
| TOTP secret storage | AES-256-GCM at rest, key from `FLOWAUTH_ENCRYPTION_KEY` |
| Backup codes | Argon2id hashed, single-use, consumed on verify |
| MFA challenge token | Opaque, 5 min TTL, Redis, bound to `userId` + `appId` |
| Session tokens | 32-byte random, stored hashed in DB |
| API keys | `sk_live_` prefix, hashed, scoped to application |
| Password hashing | Argon2id (same params as current FlowChat) |
| Audit | Append-only `audit_events`, 90-day retention MVP |
| Rate limits | 10 login attempts / 15 min / IP; 5 MFA attempts / 5 min / user |

---

## 10. Commercial model (V1)

| Tier | Includes |
|---|---|
| **Free** | 1 app, 1 000 MAU, TOTP MFA, community support |
| **Pro** | 5 apps, 10 000 MAU, OAuth, webhooks, email support |
| **Enterprise** | Unlimited apps, SAML, MFA policies, SLA, dedicated support |

FlowChat runs on an internal **Platform** tier (no MAU limits). Metering via `audit_events` + monthly active `auth_users` count per application.

---

## 11. Immediate next steps (recommended path)

```
Now          Week 1           Week 2              S3 continues
 │              │                │                    │
 ▼              ▼                ▼                    ▼
Commit S2-8   Scaffold        FlowChat cutover     Widget + convos
2FA WIP       FlowAuth        to FlowAuth SDK      (auth stable)
(in api)      + port MFA
```

### Step 1 — This week (unblock Sprint 2)

1. Commit the in-progress 2FA work in `services/api` so Sprint 2 DoD is met.
2. Add `/settings/inboxes` UI (Sprint 2 gap).
3. Start **FA-1** scaffold in parallel — no FlowChat cutover yet.

### Step 2 — Week 1

4. Build FlowAuth schema + port auth/MFA routes (FA-2 → FA-5).
5. Add `services/auth` to `turbo.json` dev task and `.env.example`.

### Step 3 — Week 2

6. Ship `@flowauth/sdk`; point `apps/web` auth calls at FlowAuth.
7. Remove embedded `/auth` routes from `services/api`.
8. Migrate staging users.

### Step 4 — Sprint 3+

9. Proceed with widget and conversations — auth is a stable dependency.
10. Document external API for first pilot customer.

---

## 12. Definition of done

### FlowAuth MVP

- [ ] FlowChat sign-up, sign-in, sign-out, MFA enrol/verify works via FlowAuth
- [ ] `services/api` and `services/ws` validate sessions only via introspect
- [ ] No `password_hash`, `totp_secret`, or `sessions` in FlowChat DB
- [ ] Second application can authenticate users with its own API key
- [ ] Audit log captures all security events
- [ ] OpenAPI docs published

### FlowChat consumer

- [ ] `account_users.auth_user_id` links to FlowAuth identity
- [ ] Agent invite creates FlowAuth user + FlowChat membership
- [ ] Settings → Security page uses `@flowauth/sdk`
- [ ] CI passes with FlowAuth service in test harness

---

## 13. Open decisions

| Decision | Recommendation | Owner |
|---|---|---|
| Product name | FlowAuth (internal), rebrand before GA | Product |
| Separate Neon DB vs shared schema | Separate `flowauth` database on same Neon project | Eng |
| JWT vs opaque sessions | Opaque sessions MVP; optional JWT for third-party APIs in V1 | Eng |
| Hosted UI vs SDK-only MVP | SDK-only MVP; hosted UI in V1 | Product |
| Keep Lucia or custom sessions | Custom sessions (current approach) — simpler for multi-tenant | Eng |

---

*This plan supersedes embedded 2FA in `services/api` as the long-term architecture. Sprint 2 2FA commit is a deliberate short-term bridge, not the final state.*
