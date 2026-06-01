# FlowChat — Recommended Tech Stack

> Modern, scalable, developer-friendly. Designed to handle the full feature set in `features.md` without the constraints of Chatwoot's Rails monolith.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FlowChat Platform                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Web App     │  │  Mobile App  │  │  Widget SDK      │  │
│  │  (Next.js)   │  │  (Expo RN)   │  │  (Vanilla JS)    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └────────────────┬┴──────────────────-─┘            │
│                          │ HTTPS / WSS                      │
│  ┌───────────────────────▼─────────────────────────────┐   │
│  │              API Gateway (Hono / Nginx)              │   │
│  └──┬──────────┬──────────┬──────────┬────────────────-─┘   │
│     │          │          │          │                      │
│  ┌──▼──┐  ┌───▼──┐  ┌────▼──┐  ┌───▼────┐                 │
│  │ API │  │ WS   │  │ Jobs  │  │ AI     │                  │
│  │ svc │  │ svc  │  │ svc   │  │ svc    │                  │
│  │Hono │  │Bun   │  │BullMQ │  │Vercel  │                  │
│  └──┬──┘  └───┬──┘  └────┬──┘  │AI SDK  │                 │
│     └─────────┴──────────┴───  └────────┘                  │
│                    │                                         │
│  ┌─────────────────▼──────────────────────────────────┐    │
│  │              Data Layer                             │    │
│  │  PostgreSQL 16   Redis 7   S3/R2   Typesense       │    │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend — Web App

### Framework
**[Next.js 15](https://nextjs.org/)** — App Router + React Server Components

| Why | Detail |
|---|---|
| RSC | Load conversation lists server-side; stream updates client-side |
| Route groups | Clean separation of `(auth)`, `(dashboard)`, `(public)` |
| Edge runtime | Middleware for auth redirects at the CDN edge |
| Turbopack | Sub-100 ms HMR in dev |

### UI & Styling
| Package | Role |
|---|---|
| **Tailwind CSS v4** | Utility-first styling (replaces all scoped CSS) |
| **shadcn/ui** | Copy-paste component library built on Radix + Tailwind |
| **Radix UI** | Headless primitives — Dialog, Dropdown, Tooltip, etc. |
| **Heroicons v2** | Primary icon set |
| **Lucide React** | Supplementary channel/domain icons |
| **Framer Motion** | Micro-animations — panel slides, toast enter/exit |

### State Management
| Package | Role |
|---|---|
| **Zustand** | Global UI state (selected conversation, agent status, sidebar) |
| **TanStack Query v5** | Server-state cache — conversations, contacts, reports |
| **Immer** | Immutable update helpers inside Zustand slices |

### Real-time
| Package | Role |
|---|---|
| **Socket.io-client** | WebSocket channel subscriptions |
| **@tanstack/query** | `invalidateQueries` on socket events keeps cache fresh |

### Forms & Validation
| Package | Role |
|---|---|
| **React Hook Form** | Performance-first form state |
| **Zod** | Schema validation (shared with backend types) |

### Rich Text
| Package | Role |
|---|---|
| **Tiptap** | Extensible ProseMirror editor — reply composer, article editor |
| **tiptap-markdown** | Paste / export markdown |

### Internationalisation
| Package | Role |
|---|---|
| **next-intl** | i18n routing + translations (replaces i18n-ally / vue-i18n) |

---

## Frontend — Embeddable Widget

**Vanilla TypeScript** bundled with **Vite** as a single `flowchat.js` IIFE.

- Zero framework dependency (size target < 20 kB gzipped)
- Shadow DOM for style isolation
- `postMessage` API for host-page integration
- WebSocket connection to WS service
- Offline queue with `localStorage` fallback

---

## Mobile App

**[Expo](https://expo.dev/) + React Native** (managed workflow)

| Why | Detail |
|---|---|
| Shared JS logic | Reuse Zod schemas, API clients, Zustand stores from web |
| Expo Router | File-based navigation identical to Next.js App Router |
| EAS Build | CI/CD + OTA updates without app store review |
| FCM + APNs | Push notifications via `expo-notifications` |

---

## Backend

### Runtime & Framework
**[Bun](https://bun.sh/)** runtime + **[Hono](https://hono.dev/)** framework

| Why | Detail |
|---|---|
| Bun | 4× faster startup vs Node; built-in SQLite for tests; native TypeScript |
| Hono | Tiny (12 kB), edge-compatible, type-safe routing via `hono/zod-openapi` |
| Type safety | Zod validators on every route auto-generate OpenAPI 3.1 spec |

### Service Layout (modular monorepo, split when needed)

```
services/
  api/          ← REST API (Hono)
  ws/           ← WebSocket server (Bun.serve + ws)
  worker/       ← Background jobs (BullMQ)
  ai/           ← AI inference service (Vercel AI SDK)
```

### ORM & Database Access
**[Drizzle ORM](https://orm.drizzle.team/)** + **PostgreSQL 16**

| Why | Detail |
|---|---|
| Drizzle | SQL-first, fully typed, zero magic, migrations as TypeScript |
| PostgreSQL 16 | JSONB custom attrs, GIN full-text search, logical replication |
| pgvector | Vector embeddings for AI knowledge base (Captain equivalent) |
| pg_trgm | Fuzzy contact search |

### Caching & Queues
| Service | Role |
|---|---|
| **Redis 7** (Upstash or self-hosted) | Session store, rate limiting, pub/sub, BullMQ queue backend |
| **BullMQ** | Job queues — email sending, webhook delivery, campaign dispatch, AI doc sync |
| **Ioredis** | Redis client with cluster support |

### Real-time
**Bun WebSocket server** — native, no extra library needed.

- Rooms keyed by `account_id:conversation_id`
- Presence tracking (typing, online status) via Redis pub/sub
- Socket.io protocol compatibility layer for the web client

### Authentication
| Package | Role |
|---|---|
| **Lucia** | Session management, account/session model |
| **Arctic** | OAuth 2.0 providers — Google, GitHub, Microsoft |
| **oslo** | TOTP/OTP (2FA), CSRF, password hashing (argon2) |
| **@node-rs/argon2** | Fast argon2 via native bindings (Bun-compatible) |

### Email
| Package | Role |
|---|---|
| **React Email** | Template authoring in JSX/TSX |
| **Resend** | Transactional delivery (DKIM, bounce handling) — swap for SES/Postmark |
| **IMAP-simple** | Inbound email polling for email channel inbox |

### File Storage
**Cloudflare R2** (S3-compatible, no egress fees)

- Pre-signed upload URLs for attachments
- CDN delivery via Cloudflare
- Fallback to AWS S3 or MinIO (same SDK)

### Search
**[Typesense](https://typesense.org/)** — conversations, messages, contacts, articles

- Typo-tolerant full-text search
- Faceted filters (status, assignee, inbox, label)
- Much simpler ops than Elasticsearch

---

## AI / Captain Service

**[Vercel AI SDK](https://sdk.vercel.ai/)** — provider-agnostic

| Provider | Use case |
|---|---|
| OpenAI GPT-4o | Reply suggestions, summarisation, rewrite |
| Anthropic Claude 3.5 Sonnet | Long-context conversation analysis, copilot |
| Google Gemini Flash | Cost-efficient classification, label suggestion |

### Embeddings & Vector Store
- **text-embedding-3-small** (OpenAI) for knowledge base articles
- **pgvector** extension on PostgreSQL — no separate vector DB needed at MVP scale

### RAG Pipeline
```
Document ingest → chunk → embed → store in pgvector
Agent query → embed query → cosine similarity search → inject context → LLM
```

---

## Infrastructure

### Hosting
| Layer | Service |
|---|---|
| Frontend (Next.js) | **Vercel** — zero-config, Edge CDN, preview deploys |
| API / WS / Worker | **Railway** or **Render** — Bun containers, easy scaling |
| Database | **Neon** (serverless Postgres) or **Supabase** |
| Redis | **Upstash** (serverless) |
| Search | **Typesense Cloud** or self-hosted on Railway |
| Files | **Cloudflare R2** |
| Email delivery | **Resend** |

### CI / CD
| Tool | Role |
|---|---|
| **GitHub Actions** | Test, lint, type-check on every PR |
| **Turborepo** | Monorepo task caching & incremental builds |
| **Biome** | Linter + formatter (replaces ESLint + Prettier, 35× faster) |
| **Vitest** | Unit + integration tests (Bun-native runner as alternative) |
| **Playwright** | E2E tests against staging |

### Observability
| Tool | Role |
|---|---|
| **OpenTelemetry** | Traces + metrics (vendor-neutral) |
| **Axiom** | Log aggregation (cheap, fast query) |
| **Sentry** | Error tracking (frontend + backend) |
| **Checkly** | Synthetic monitoring on critical API flows |

---

## Monorepo Structure

```
flowchat/
├── apps/
│   ├── web/              ← Next.js 15 dashboard
│   ├── widget/           ← Embeddable JS widget (Vite)
│   └── mobile/           ← Expo React Native app
├── services/
│   ├── api/              ← Hono REST API (Bun)
│   ├── ws/               ← WebSocket service (Bun)
│   ├── worker/           ← BullMQ job service
│   └── ai/               ← AI inference service
├── packages/
│   ├── db/               ← Drizzle schema + migrations
│   ├── types/            ← Zod schemas (shared frontend/backend)
│   ├── email/            ← React Email templates
│   ├── ui/               ← Shared design system (shadcn base)
│   └── config/           ← Shared ESLint, TS, Tailwind configs
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Dependency Version Targets (at time of writing)

| Package | Version |
|---|---|
| Node.js (fallback) | 22 LTS |
| Bun | 1.2+ |
| TypeScript | 5.5+ |
| Next.js | 15+ |
| React | 19+ |
| Tailwind CSS | 4+ |
| Drizzle ORM | 0.36+ |
| Hono | 4+ |
| BullMQ | 5+ |
| Zod | 3.23+ |
| Vitest | 2+ |
| Turbo | 2+ |
| Biome | 1.9+ |

---

## Migration Path from Chatwoot

If migrating existing data:

1. **Schema mapping** — Chatwoot PostgreSQL → Drizzle migrations (most models map 1:1)
2. **Auth** — export accounts, re-hash passwords (argon2), re-issue sessions
3. **Files** — `aws s3 sync` from existing bucket → R2
4. **Webhooks** — existing customers re-register; secret rotation required
5. **API compatibility** — implement a `/v1` compatibility shim over the new Hono router to avoid breaking integrations

---

*Last updated: 2026-06-01*
