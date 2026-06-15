# Mutex Systems — Complete Setup Guide

End-to-end guide for deploying and configuring the Mutex Systems sales & communication stack:

| Product | Role | Repo |
|---|---|---|
| **Flow** (FlowChat + CRM) | Live chat, inbox, contacts, lead sync | [samihyder/flowchat](https://github.com/samihyder/flowchat) |
| **LeadSnapper** | B2B lead capture from Google (Chrome extension) | `leadsnapper` |
| **DAS** | Quotes, invoices, proposals, PDF (optional) | `das` |

**Production URLs (reference)**

| Service | URL |
|---|---|
| Flow web app | [flowchat-web-ten.vercel.app](https://flowchat-web-ten.vercel.app) |
| Flow API (legacy Railway) | `flowchat-production-be88.up.railway.app` |
| WebSocket | `wss://flowchat-ws-production.up.railway.app` |

---

## Architecture

```mermaid
flowchart LR
  subgraph prospecting [Prospecting]
    LS[LeadSnapper Extension]
    Google[Google Search / Maps]
  end

  subgraph flow [Flow Platform]
    CRM[Flow CRM Contacts]
    Chat[FlowChat Inbox + Widget]
    API[Integration API]
  end

  subgraph close [Close]
    DAS[DAS Documents]
    Site[mutexsystems.com]
  end

  Google --> LS
  LS -->|Hot/Warm leads| API
  API --> CRM
  Site -->|widget.js| Chat
  Chat --> CRM
  CRM -.->|future| DAS
```

**Typical workflow**

1. **LeadSnapper** — Scan Google, enrich (Companies House → Openmart → Cognism in UK; Openmart → Lusha in US), score Hot/Warm.
2. **Flow CRM** — Qualified leads sync as contacts with phones, LinkedIn, social links, enrichment sources.
3. **FlowChat** — Website widget on [mutexsystems.com](https://mutexsystemsltd.com) captures inbound chats; auto welcome messages greet visitors online and offline.
4. **DAS** — Generate quotations/invoices from CRM clients (local MVP today; production integration planned).

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | All repos |
| pnpm 9+ | FlowChat monorepo |
| PostgreSQL | [Neon](https://neon.tech) recommended for Flow |
| Redis | Required for real-time chat (Railway Redis or Upstash) |
| Chrome | LeadSnapper extension |
| `psql` CLI | Apply SQL migrations |

**Accounts to create**

- [Neon](https://neon.tech) — PostgreSQL for Flow
- [Vercel](https://vercel.com) — Flow web app hosting
- [Railway](https://railway.app) — WebSocket service + Redis (if not using Upstash)
- [Companies House API](https://developer.company-information.service.gov.uk/) — free UK company lookup (LeadSnapper)
- Openmart, Cognism (UK), Lusha (US) — optional mobile enrichment APIs

---

## Part 1 — Flow platform (production)

### 1.1 Clone and configure

```bash
git clone https://github.com/samihyder/flowchat.git
cd flowchat
pnpm install
cp .env.example .env
```

### 1.2 Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Variable | Required | Example / notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooler URL (`?sslmode=require`) |
| `JWT_SECRET` | Yes | 32+ random characters |
| `REDIS_URL` | Yes | `redis://…` — real-time chat & pub/sub |
| `NEXT_PUBLIC_WS_URL` | Yes | `wss://flowchat-ws-production.up.railway.app` |
| `NEXT_PUBLIC_WEB_APP_URL` | Yes | `https://flowchat-web-ten.vercel.app` |
| `CRON_SECRET` | For email cron | Random 32-byte hex |
| `R2_ACCOUNT_ID` | Optional | Cloudflare R2 for file uploads |
| `R2_ACCESS_KEY_ID` | Optional | |
| `R2_SECRET_ACCESS_KEY` | Optional | |
| `R2_BUCKET_NAME` | Optional | e.g. `flowchat-production` |
| `R2_PUBLIC_URL` | Optional | Public R2 CDN URL |
| `RESEND_API_KEY` | For email marketing | From [resend.com](https://resend.com) — Sprint 6 outbound campaigns |
| `RESEND_FROM_EMAIL` | For email marketing | e.g. `Mutex Systems <hello@mutexsystemsltd.com>` |

**Local development**

```bash
# .env (root)
DATABASE_URL=postgresql://...
JWT_SECRET=your-local-secret-min-32-chars
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

Run the web app:

```bash
cd apps/web && pnpm dev
# → http://localhost:3100
```

### 1.3 Database migrations

Apply all migrations in order against your Neon database:

```bash
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

for f in packages/db/drizzle/000*.sql packages/db/drizzle/001*.sql; do
  echo "Applying $f..."
  psql "$DATABASE_URL" -f "$f"
done
```

Or apply the **six Sprint 6 bundles** individually (recommended for upgrades):

```bash
./scripts/apply-sprint6-migrations.sh              # 0010 — CRM contacts, notes, labels
./scripts/apply-sprint6-integrations-migrations.sh   # 0011 — API keys, webhooks, inbound sync
# 0012 is in sprint6-migrations path — included in apply-all-migrations.sh
psql "$DATABASE_URL" -f packages/db/drizzle/0012_sprint6_crm_complete.sql
./scripts/apply-sprint6-email-marketing-migrations.sh  # 0013 — segments, templates, campaigns
./scripts/apply-sprint6-email-phase2-migrations.sh     # 0014 — senders, workflows, double opt-in
./scripts/apply-sprint6-complete-migrations.sh         # 0015 + 0016 — workflows, A/B, preferences
psql "$DATABASE_URL" -f packages/db/drizzle/0017_visitor_geo_greetings.sql
```

| Migration | Sprint 6 bundle | Enables |
|---|---|---|
| `0010_sprint6_crm.sql` | CRM core | Contact notes, contact labels, indexes |
| `0011_crm_integrations.sql` | Integrations | API keys, webhooks, inbound contact sync |
| `0012_sprint6_crm_complete.sql` | CRM complete | Custom attributes, CSV import jobs, conversation participants |
| `0013_sprint6_email_marketing.sql` | Email foundation | Segments, templates, broadcast campaigns, suppressions |
| `0014_sprint6_email_phase2.sql` | Email phase 2 | Multiple senders, automation workflows, double opt-in |
| `0015_sprint6_complete.sql` | Email complete | Workflow branches, campaign pause/A-B, template archive |
| `0016_sprint6_stretch.sql` | Stretch | Send-time optimization, preferences, A/B winner |
| `0017_visitor_geo_greetings.sql` | Chat + CRM | Multi-line greetings, visitor country code |

**Migrations by sprint (S1–S6)**

| Sprint | SQL files | Apply script |
|---|---|---|
| **S1** Foundation | `0000_concerned_speedball.sql` | included in `apply-all-migrations.sh` |
| **S2** Teams & agents | `0001_sprint2_inboxes_teams.sql` | included in `apply-all-migrations.sh` |
| **S3** Web chat widget | `0002_sprint3_conversations.sql`, `0003_widget_customization.sql` | included in `apply-all-migrations.sh` |
| **S4** Lifecycle & trust | `0004`–`0008` | `./scripts/apply-sprint4-migrations.sh` (+ `0004`, `0005` in apply-all) |
| **S5** Rich messaging | `0009_sprint5_messaging.sql` | `./scripts/apply-sprint5-migrations.sh` |
| **S6** CRM + email | `0010`–`0017` | Sprint 6 scripts (see above) |

Fresh install — one command:

```bash
./scripts/apply-all-migrations.sh
```

Per-sprint upgrade (if jumping from an older deploy):

```bash
./scripts/apply-sprint4-migrations.sh   # S4 only (also run 0004/0005 if missing)
./scripts/apply-sprint5-migrations.sh   # S5 only
./scripts/apply-sprint6-migrations.sh && \
./scripts/apply-sprint6-integrations-migrations.sh && \
psql "$DATABASE_URL" -f packages/db/drizzle/0012_sprint6_crm_complete.sql && \
./scripts/apply-sprint6-email-marketing-migrations.sh && \
./scripts/apply-sprint6-email-phase2-migrations.sh && \
./scripts/apply-sprint6-complete-migrations.sh && \
psql "$DATABASE_URL" -f packages/db/drizzle/0017_visitor_geo_greetings.sql
```

### 1.4 Deploy to Vercel

```bash
# From repo root — Vercel links to apps/web
vercel --prod
```

Or connect [samihyder/flowchat](https://github.com/samihyder/flowchat) to Vercel with:

- **Root directory:** `apps/web`
- **Build command:** `cd ../.. && pnpm install && pnpm --filter @flowchat/web build`
- **Output:** Next.js default

Confirm build passes locally first:

```bash
pnpm build
```

### 1.5 WebSocket service (Railway)

Real-time agent chat requires the WS service + Redis:

1. Deploy `services/ws` to Railway
2. Add Redis plugin; set `REDIS_URL` on both WS service and Vercel web app
3. Set `NEXT_PUBLIC_WS_URL` on Vercel to the Railway WS public URL

---

## Part 2 — Sprint setup guide (S1 → S6)

Complete Mutex Systems configuration follows the Flow sprint plan. Work through each sprint in order — **Sprint 6 (CRM) requires Sprints 4–5 (chat module) to be configured first.**

| Sprint | Theme | Mutex setup focus |
|---|---|---|
| **S1** | Foundation | Deploy, sign-up, workspace created |
| **S2** | Teams & agents | Invite team, 2FA, Redis + WebSocket |
| **S3** | Web live chat | Inbox, widget embed, first conversation |
| **S4** | Lifecycle & trust | Labels, business hours, domain allowlist, GDPR |
| **S5** | Rich messaging | Canned replies, CSAT, analytics, webhooks, geo sidebar |
| **S6** | CRM + email | Contacts, LeadSnapper, segments, campaigns, workflows |

Reference: [docs/sprints.md](sprints.md)

---

### Sprint 1 — Foundation (S1-1 – S1-9)

**Goal:** Platform deployed; admin can sign in.

#### Infrastructure (one-time)

1. Clone repo, `pnpm install`, configure `.env` (Part 1.2)
2. Apply migration `0000` (or `./scripts/apply-all-migrations.sh`)
3. Deploy `apps/web` to Vercel; confirm `pnpm build` passes
4. Set `DATABASE_URL`, `JWT_SECRET` on Vercel

#### Mutex configuration

1. **Sign up** at `/sign-up` — first user becomes administrator
2. **Workspace name:** `Mutex Systems`
3. **Timezone:** `Europe/London` (set later in Settings → Account)

#### Verify S1

- [ ] Sign-up, sign-in, sign-out work
- [ ] Dashboard shell loads at `/dashboard`
- [ ] Staging/production URL accessible
- [ ] CI passes on GitHub ([samihyder/flowchat](https://github.com/samihyder/flowchat))

---

### Sprint 2 — Teams & agents (S2-1 – S2-8)

**Goal:** Multi-agent workspace with real-time presence.

**Migration:** `0001_sprint2_inboxes_teams.sql`

#### Infrastructure

1. Deploy `services/ws` to Railway
2. Add **Redis** (Railway plugin or Upstash)
3. Set on Vercel: `REDIS_URL`, `NEXT_PUBLIC_WS_URL=wss://…`
4. Set on Railway WS service: `DATABASE_URL`, `REDIS_URL`

#### Mutex configuration

| Setting | Path | Mutex value |
|---|---|---|
| Account name | **Settings → Account** | Mutex Systems |
| Timezone | **Settings → Account** | `Europe/London` |
| Locale | **Settings → Account** | `en-GB` |
| Logo | **Settings → Account** | Upload Mutex logo (requires R2 env vars) |
| Agents | **Settings → Agents** | Invite UK BD, Caller, PM/Technical closer |
| Roles | **Settings → Agents** | First user = administrator; others = agent |
| Teams | **Settings → Teams** | e.g. `UK Sales`, `Technical` — assign agents |
| 2FA | **Settings → Security** | Enable TOTP for admin accounts |

#### Verify S2

- [ ] Admin can invite and deactivate agents
- [ ] Teams created with members assigned
- [ ] Agent availability toggle works (online/busy/offline)
- [ ] WebSocket connects on login; status dot visible in sidebar
- [ ] 2FA enrolment and sign-in with authenticator code works

---

### Sprint 3 — Web live chat (S3-1 – S3-7)

**Goal:** Website widget live; visitors chat with agents in real time.

**Migrations:** `0002_sprint3_conversations.sql`, `0003_widget_customization.sql`

#### Mutex configuration

1. **Settings → Inboxes → Create inbox**
   - Channel: **Website widget**
   - Name: `Mutex Systems Website`
2. **Customize widget** — Mutex brand colours (primary `#6366F1`, accent `#14B8A6`), launcher icon, welcome title/tagline
3. **Pre-chat form** — collect name + email (optional: company)
4. **Greeting message** — single-line fallback (multi-line auto messages come in S5 settings)
5. Copy **embed code** → paste before `</body>` on [mutexsystemsltd.com](https://mutexsystemsltd.com)

```html
<script>
  window.flowchat = {
    inboxId: "<your-inbox-uuid>",
    apiUrl: "https://flowchat-web-ten.vercel.app/api",
    configUrl: "https://flowchat-web-ten.vercel.app/api",
    wsUrl: "wss://flowchat-ws-production.up.railway.app"
  };
</script>
<script src="https://flowchat-web-ten.vercel.app/widget.js?v=9" async></script>
```

6. Test locally: `apps/web/public/test-widget.html`

#### Verify S3

- [ ] Widget loads on allowed domain; chat bubble appears
- [ ] Visitor sends message → conversation appears in dashboard within ~1 s
- [ ] Agent reply → visitor receives it in widget in real time
- [ ] Conversation list shows unread count and last message preview
- [ ] Embed code generator matches production URLs

---

### Sprint 4 — Lifecycle & trust (S4-1 – S4-19)

**Goal:** Production-grade conversation ops, business hours, security, GDPR.

**Migrations:** `0004`–`0008` — run `./scripts/apply-sprint4-migrations.sh` (plus `0004`, `0005` if not already applied)

#### Mutex configuration — lifecycle

| Feature | Where to configure |
|---|---|
| Labels | **Settings → Labels** — create `Sales`, `Support`, `Hot`, `Follow-up` |
| Assignment | Dashboard → conversation → assign agent or team |
| Status | Open / Pending / Resolved / Snoozed — use list filters |
| Priority | Set urgent/high on hot inbound leads |
| Snooze | Snooze follow-ups with wake-up time |
| Filters | Filter by status, assignee, team, inbox, label, priority |
| Mine / Unassigned | Dashboard queue views |

#### Mutex configuration — availability & trust

| Feature | Where to configure | Mutex recommendation |
|---|---|---|
| Business hours | **Inbox settings** | Mon–Fri 09:00–17:30, timezone `Europe/London` |
| Offline message | **Inbox settings** | *We're currently offline. Leave your message and we'll reply within 24 hours.* |
| Offline receipt | **Inbox settings** | Auto-reply when visitor messages while offline |
| Domain allowlist | **Inbox settings** | `mutexsystemsltd.com`, `mutexsystems.com`, `localhost` |
| GDPR consent | **Inbox settings** | Enable pre-chat consent + privacy policy link |
| Data retention | **Settings → Account** | Set retention policy per compliance needs |
| Block visitor | Conversation → block by IP/contact | Use for spam |
| Analytics exclusions | **Inbox settings** | Exclude office IP + test machines from stats |
| Agent approval | **Settings → Agents** | Approve pending agents; assign inbox access |
| Invite email domain | **Settings → Account** | Optional: restrict to `@mutexsystemsltd.com` |

#### Verify S4

- [ ] Assign, reassign, snooze, label conversations
- [ ] Widget shows online/away/offline based on business hours + agent presence
- [ ] Widget blocked on non-allowlisted domains
- [ ] New message tab badge + sound alert for agents
- [ ] Missed-chat email/in-app alert fires when threshold exceeded
- [ ] GDPR consent shown in pre-chat form
- [ ] Analytics exclusions omit internal traffic

---

### Sprint 5 — Rich messaging & chat module complete (S5-1 – S5-21)

**Goal:** Industry-standard chat before CRM. **Gate:** complete S5 before starting S6.

**Migration:** `0009_sprint5_messaging.sql` — run `./scripts/apply-sprint5-migrations.sh`

See full checklist: [docs/chat-module-standard.md](chat-module-standard.md)

#### Mutex configuration — messaging

| Feature | Where to configure |
|---|---|
| File attachments | Conversation composer (requires R2 env vars) |
| Private notes | Conversation → internal notes (never sent to visitor) |
| Canned responses | **Settings → Shortcuts** — e.g. `/pricing`, `/demo`, `/services` |
| Read receipts | Automatic when WS connected |
| CSAT | **Inbox settings** → enable post-resolve star rating |
| Pre-chat fields | **Inbox settings** → custom fields (text, select, required) |
| Visitor sidebar | Conversation view — URL, referrer, **country**, device, visit count |
| Conversation search | Dashboard search bar — name, email, message body |
| Webhooks | **Settings → Integrations** — `conversation.created`, `message.created`, `conversation.resolved` |
| Audit log | **Settings → Integrations** → view agent action log |

#### Auto messages (Mutex defaults)

**Settings → Auto messages** (requires migration `0017`)

1. *Hi, welcome to Mutex Systems!*
2. *We help businesses build secure applications, integrate AI automation, and deploy scalable cloud infrastructure with enterprise-grade cybersecurity.*
3. *How can our experts help you today — software development, AI, cybersecurity, cloud, or hardware?*

- **Save workspace defaults** → **Apply to all website inboxes**
- Auto messages fire online **and** offline (offline notice appended when agents away)

#### Mutex canned response examples

| Shortcut | Text |
|---|---|
| `/services` | We offer cybersecurity, software development, AI automation, cloud infrastructure, CRM, chat, and MFA solutions. |
| `/demo` | Happy to arrange a demo — what day works best for a 30-minute call? |
| `/pricing` | Pricing depends on scope — share your requirements and we'll send a tailored proposal. |

#### Verify S5 (chat module gate)

- [ ] Attachments upload and preview in thread
- [ ] Private notes and `@agent` mentions work
- [ ] Canned responses insert via shortcut
- [ ] CSAT rating collected after resolve
- [ ] **Dashboard → Analytics** shows FRT, resolution time, missed rate
- [ ] Conversation search returns results
- [ ] Webhooks deliver signed payloads to test endpoint
- [ ] Visitor sidebar shows country (Vercel geo headers in production)
- [ ] Auto welcome messages on new conversations (online + offline)
- [ ] Sign off [chat-module-standard.md](chat-module-standard.md) Must items before S6

---

### Sprint 6 — CRM & email marketing (S6-1 – S6-23)

**Goal:** Contact management, LeadSnapper sync, outbound email automation.

**Prerequisite:** S5 chat module gate passed.

**Migrations:** `0010`–`0017` — see Part 1.3 Sprint 6 bundles.

**Additional env:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`; verify sending domain in Resend.

#### S6 — CRM contacts (S6-1 – S6-9)

| Step | Path | Action |
|---|---|---|
| Labels | **Settings → Labels** | `Hot Lead`, `Warm Lead`, `Mutex`, `Nexus`, `No Chat Widget`, `UK`, `US` |
| Import/export | **Settings → CRM** | Enable CSV import/export; set agent allowlists |
| Custom attributes | **Settings → CRM** | Add fields or **Save & provision** LeadSnapper fields |
| Contacts | **Dashboard → Contacts** | Search, filter, create, edit, merge, notes |
| CSV import | **Contacts → Import** | Map columns; download error report |
| CSV export | **Contacts → Export** | Export with filters + custom attributes |
| Participants | Conversation → Add observer | Read-only agents on threads |
| Integrations | **Settings → Integrations** | API keys (`contacts:write`) + outbound webhooks |

#### S6 — LeadSnapper → CRM (S6-4c extension)

**Settings → CRM → LeadSnapper integration**

- Enable sync · Min priority: **Hot + Warm** · **Save & provision contact fields**

```
POST /api/integrations/v1/leadsnapper/leads
Authorization: Bearer fc_live_…
```

See **Part 3** for LeadSnapper extension setup and full API payload.

#### S6 — Email marketing (S6-10 – S6-23)

| Pillar | Path | Mutex setup |
|---|---|---|
| 1. Audience | **Dashboard → Marketing → Segments** | Static + dynamic segments; preview counts |
| 2. Sender | **Settings → Email marketing** | From: `Mutex Systems <hello@mutexsystemsltd.com>`; UK physical address |
| 2. Templates | **Dashboard → Marketing → Templates** | HTML templates with `{{first_name}}` merge tags |
| 3. Campaigns | **Dashboard → Marketing → Campaigns** | Broadcast to segment; monitor live progress |
| 4. Workflows | **Dashboard → Marketing → Workflows** | Welcome drip, post-chat follow-up, hot-lead nurture |
| 5. Compliance | **Settings → Email marketing** | Suppression list; optional double opt-in |
| 6. Analytics | Campaign detail + contact profile | Open/click rates; email timeline on contact |

Example Mutex workflows:

| Workflow | Trigger | Steps |
|---|---|---|
| Welcome drip | Contact created | Day 0 email → wait 3 days → services overview |
| Post-chat | Conversation resolved | Wait 1 day → thank-you email |
| Hot lead | Label `Hot Lead` added | Immediate BD notification email |

#### Verify S6

- [ ] All Sprint 6 migrations applied (`0010`–`0017`)
- [ ] CSV import/export with governance works
- [ ] Contact merge, notes, custom attributes on profile
- [ ] LeadSnapper sync creates contacts with enrichment fields
- [ ] Resend sender verified; test email delivers
- [ ] Segment + template + broadcast campaign completes
- [ ] Workflow runs on contact-created trigger
- [ ] Unsubscribe suppresses contact immediately
- [ ] Campaign analytics + contact email history visible

---

## Part 3 — LeadSnapper extension (connects to S6 CRM)

### 3.1 Enable LeadSnapper sync in Flow

1. **Settings → Integrations → API keys → Create key**
   - Name: `LeadSnapper`
   - Scope: `contacts:write`
   - Copy the secret (`fc_live_…`) — shown once

2. **Settings → CRM → LeadSnapper integration**
   - Enable **LeadSnapper sync**
   - Minimum priority: **Hot + Warm** (recommended)
   - Click **Save & provision contact fields**

This creates 30+ custom contact attributes including:

| Category | Fields |
|---|---|
| Lead scoring | `lead_score`, `lead_priority`, `lead_status`, `brand_fit` |
| Business | `business_name`, `website`, `domain`, `business_phone`, `business_linkedin` |
| Owner | `owner_name`, `owner_phone`, `owner_mobile`, `owner_linkedin` |
| Social | `facebook_url`, `instagram_url`, `tiktok_url`, `youtube_url`, `x_twitter_url`, `whatsapp_url`, `social_links` |
| Enrichment | `enrichment_market`, `enrichment_pipeline`, `enrichment_providers`, `companies_house_uk`, `openmart`, `cognism_uk`, `lusha_us` |
| Intel | `google_rating`, `has_chat_widget`, `chat_widget_provider`, `tech_stack` |

### 3.2 Inbound API reference

```
POST https://flowchat-web-ten.vercel.app/api/integrations/v1/leadsnapper/leads
Authorization: Bearer fc_live_…
Content-Type: application/json
```

```json
{
  "source": "leadsnapper",
  "leads": [{
    "leadId": "uuid",
    "businessName": "Acme Ltd",
    "email": "info@acme.com",
    "phone": "+44 20 1234 5678",
    "website": "https://acme.com",
    "linkedinUrl": "https://linkedin.com/company/acme-ltd",
    "decisionMakerLinkedin": "https://linkedin.com/in/janesmith",
    "ownerPhone": "+44 7700 900123",
    "ownerMobile": "+44 7700 900123",
    "city": "London",
    "targetMarket": "UK",
    "leadScore": 78,
    "leadPriority": "Hot",
    "b2bSource": "UK: Companies House → Openmart → Cognism",
    "mobileSource": "Cognism",
    "companiesHouseMatched": true,
    "facebookUrl": "https://facebook.com/acme"
  }]
}
```

**Dedupe order:** LeadSnapper lead ID → email → domain.

### 3.3 Build and install extension

```bash
cd leadsnapper/extension
pnpm install
pnpm build
```

Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → select `extension/dist`.

### 3.4 Configure brands, presets & API keys

**Settings → Brands** (pre-loaded):

| Brand | Services |
|---|---|
| **Mutex Systems** | Cybersecurity, Software Dev, POS/TiLedger, CRM, Chat, MFA, Lead Gen, Marketing Analytics, Content Publishing, Book Publishing |
| **NexusCorp-Ltd** | Design, Development, AI Automation, E-commerce Automation, Oracle Unifier, Resource Augmentation |

**Settings → Local SMB mode** (default ON):

| Market | Waterfall |
|---|---|
| **UK** | Companies House → Openmart → Cognism |
| **US** | Openmart → Lusha |

Register keys in **Settings → Local SMB API Keys** — Companies House (free), Openmart, Cognism, Lusha.

### 3.5 Connect extension to Flow CRM

**Settings → Flow CRM sync**

| Field | Value |
|---|---|
| API base URL | `https://flowchat-web-ten.vercel.app/api` |
| API key | `fc_live_…` from Flow Settings → Integrations |
| Enable sync | ON |

### 3.6 Sales workflow

| Step | Tab | Action |
|---|---|---|
| 1 | **Find** | Choose preset → open Google/Maps → **Scan** |
| 2 | **Results** | Expand lead → **Find owner mobile** → **Add to Pipeline** |
| 3 | **Pipeline** | Review contact details, set status |
| 4 | **Export** | **Sync qualified (Hot + Warm)** to Flow CRM |

Synced leads show a green **CRM** badge in the pipeline.

---

## Part 4 — DAS (document automation, optional)

Local MVP for quotes and invoices:

```bash
cd das
pnpm install
pnpm setup:local
pnpm dev
# → http://localhost:4000
```

1. Sign up → create brand (Mutex Systems legal profile)
2. Upload logo/stamp/signature at **Dashboard → Assets**
3. Add clients (manual or future CRM import)
4. Create templates → generate quotations/invoices

Production DAS on Vercel + Supabase is planned; CRM deep-link integration is documented in `docs/ecosystem-plan.md`.

---

## Part 5 — Mutex website checklist

Deploy the chat widget on [mutexsystemsltd.com](https://mutexsystemsltd.com):

- [ ] Embed snippet before `</body>`
- [ ] Domain allowlisted in Flow inbox settings
- [ ] Auto messages saved (workspace + inbox)
- [ ] Business hours configured (UK)
- [ ] At least one agent set to **Online** during business hours
- [ ] Test: open site → widget launches → welcome messages appear
- [ ] Test offline: set agents offline → widget shows offline greeting + notice

---

## Part 6 — Verification checklist (S1–S6)

### Sprint 1 — Foundation
- [ ] Sign-up, sign-in, sign-out work
- [ ] Dashboard loads; workspace created

### Sprint 2 — Teams & agents
- [ ] Agents invited; teams assigned
- [ ] WebSocket + Redis connected; presence visible
- [ ] 2FA enabled for admin

### Sprint 3 — Web chat
- [ ] Widget embed loads on test page
- [ ] Visitor message → agent inbox in real time
- [ ] Agent reply → visitor widget in real time

### Sprint 4 — Lifecycle & trust
- [ ] Assign, label, snooze, filter conversations
- [ ] Business hours + offline behaviour correct
- [ ] Domain allowlist blocks unauthorized embeds
- [ ] GDPR consent + analytics exclusions configured

### Sprint 5 — Rich messaging (chat gate)
- [ ] Canned responses, private notes, attachments work
- [ ] CSAT collected; FRT visible in analytics
- [ ] Webhooks + conversation search work
- [ ] Auto messages + visitor country in sidebar
- [ ] Chat module standard Must items signed off

### Sprint 6 — CRM + email

- [ ] Migrations `0010`–`0017` applied
- [ ] CSV import/export with agent governance works
- [ ] Contact merge, notes, custom attributes on profile
- [ ] LeadSnapper sync enabled; fields provisioned; API key works
- [ ] Resend sender verified; segment + template + campaign sent
- [ ] Workflow triggers on contact created; unsubscribe suppresses
- [ ] Extension scan → sync qualified → contact in Flow CRM

### LeadSnapper (S6 extension)

- [ ] Extension built and loaded in Chrome
- [ ] UK waterfall returns owner mobile (with API keys)
- [ ] Pipeline → Export → Sync qualified succeeds

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `npm run build` fails with `Can't resolve 'dns'` | Fixed in `c82e3e0` — client pages must not import server-only `welcome-messages.ts`; use `welcome-message-defaults.ts` |
| LeadSnapper sync returns 403 | Enable LeadSnapper sync in Flow → Settings → CRM |
| LeadSnapper sync returns 401 | Check `fc_live_…` key; must include `contacts:write` |
| Widget does not load | Verify domain in inbox allowlist; check browser console for CORS/blocked script |
| No real-time messages | Confirm `REDIS_URL` on Vercel + WS service running; `NEXT_PUBLIC_WS_URL` correct |
| Auto messages not sending | Re-save auto messages; check inbox `greeting_messages` in DB; migration `0017` applied |
| Visitor country shows blank | Geo requires Vercel deployment (uses `x-vercel-ip-country` header) |
| Companies House lookup fails | Test key in Settings; enable all four CH endpoints |

---

## Quick reference — repos & docs

| Doc | Path |
|---|---|
| Sprint plan (S1–S6 stories) | `docs/sprints.md` |
| Email marketing standard | `docs/email-marketing-standard.md` |
| Chat module gate (S4–S5) | `docs/chat-module-standard.md` |
| Ecosystem plan | `docs/ecosystem-plan.md` |
| LeadSnapper usage | `leadsnapper/USAGE.md` |
| DAS spec | `das/docs/SPEC.md` |
| Env template | `.env.example` |

---

## Support contacts

| Area | Owner |
|---|---|
| Flow platform / CRM / Chat | Mutex Systems engineering |
| LeadSnapper enrichment APIs | Configure per provider dashboard |
| Website widget embed | Mutex marketing / web team |

---

*Built by [Mutex Systems](https://mutexsystemsltd.com) — UK-headquartered cybersecurity, software development, AI automation, and cloud infrastructure.*
