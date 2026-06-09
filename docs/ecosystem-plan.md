# Mutex Product Ecosystem — Integration Plan

> Understanding document for how **Flow** (platform), its modules, and sibling products (**DAS**, **LeadSnapper**, **FlowAuth**) fit together.  
> **Status:** Future work — no integration implemented yet.  
> **Last updated:** 2026-06-05

---

## Product hierarchy

```
Flow                          ← the product (customer-facing platform)
├── FlowChat                  ← module: messaging, inbox, widget, channels
├── Flow CRM                  ← module: contacts, companies, pipeline
└── (future modules)          ← automation, AI, campaigns, reports…

FlowAuth                      ← identity/MFA service (platform + sellable SaaS)

Sibling products (integrate with Flow, separate repos):
├── DAS                       ← document automation (quotes, invoices, PDF)
└── LeadSnapper               ← Chrome extension (lead capture & scoring)
```

**Flow** is one product with multiple modules. **FlowChat is not a standalone product** — it is the messaging module inside Flow. The `Flowchat` repo is the codebase for the Flow platform (naming legacy; product brand is **Flow**).

---

## 1. Portfolio overview

### Inside Flow (one product, multiple modules)

| Module | Repo path | What it does | Maturity |
|---|---|---|---|
| **FlowChat** | `Flowchat` — `/dashboard`, widget | Inbox, conversations, channels, real-time chat | Sprint 1–2 done; Sprint 3+ |
| **Flow CRM** | `Flowchat` — `/crm/*` | Contacts, companies, notes, labels, pipeline | Sprint 6 in plan; can pull forward |
| *Shared platform* | `Flowchat` — auth, accounts, teams, settings | Tenants, agents, inboxes, infra | Sprint 1–2 done |

### Platform & sibling products

| Product | Repo | Type | What it does | Maturity |
|---|---|---|---|---|
| **FlowAuth** | `Flowchat/services/auth` (planned) | Auth-as-a-Service | Identity, MFA/TOTP, OAuth — for Flow + external customers | Planned |
| **DAS** | `das` | Sibling product | Quotes, invoices, proposals, PDF, verification | MVP (local SQLite) |
| **LeadSnapper** | `leadsnapper` | Sibling product | B2B lead capture from Google, scoring, enrichment | Extension MVP |

All target the same customer journey: **find leads → manage in Flow CRM → communicate in FlowChat → close with DAS**.

---

## 2. Customer journey (how they connect)

```
  LeadSnapper       Flow CRM          FlowChat           DAS
  (sibling)    →    (Flow module) →   (Flow module)  →   (sibling)
       │                 │                 │                 │
   Google scan       Qualify &          Support &         Generate &
   Score Hot/Warm    assign owner       sell in chat      verify PDF
```

| Stage | Where it lives | User action |
|---|---|---|
| **1. Prospecting** | LeadSnapper (sibling) | Scan Google, score leads, sync to Flow |
| **2. CRM** | Flow CRM (module) | Import lead as contact |
| **3. Outreach** | FlowChat (module) | Conversation via widget / channels |
| **4. Close** | DAS (sibling) | Quotation / invoice from CRM client |
| **5. Identity** | FlowAuth (service) | SSO across Flow + integrated products |

---

## 3. Shared concepts (mapping between products)

| Concept | FlowChat / Flow CRM | DAS | LeadSnapper |
|---|---|---|---|
| Workspace | `accounts` | `brands` | Settings → brands |
| Customer record | `contacts` / `companies` | `clients` + `client_contacts` | `ScanLead` → export row |
| Brand assets | Account logo (R2) | `brand_assets` (logo, stamp, signature) | — |
| Catalog | — (future) | `products`, `services`, `catalog_components` | Service fit in settings |
| Documents | — (future: attach to conversation) | `documents` (quote, invoice, proposal…) | — |
| Lead score | Contact custom attribute | — | `leadScore`, Hot/Warm/Cold |
| Owner/director | Contact person | `client_contacts` | Owner name, LinkedIn, title |
| Auth user | `users` + FlowAuth | `users` + session cookie | — (extension only) |

**Key insight:** `LeadSnapper lead` ≈ `Flow CRM contact (type: lead)` ≈ `DAS client (prospect)` — same person, different life stage.

---

## 4. Product deep dive

### DAS — Document Automation System

**Repo:** `/das` · **Docs:** `docs/SPEC.md`, `README.md`

| Module | Capability |
|---|---|
| Brands | Company legal profile, logo, letterhead |
| Clients | Customer records with contacts |
| Catalog | Products, services, components, prices |
| Templates | Handlebars + drag-and-drop block builder, Word import |
| Documents | Quotation, invoice, proposal, SLA, NDA |
| Security | SHA-256 hash, QR verification, audit logs |
| PDF | On-demand Playwright generation (not stored) |

**Stack:** Next.js 16, SQLite (local) → Supabase (prod planned), TipTap, Handlebars, Playwright.

**Integration value:** Closes the sales loop after FlowChat conversations. Agent quotes from CRM client data without re-entering details.

---

### LeadSnapper — B2B Lead Capture Extension

**Repo:** `/leadsnapper` · **Docs:** `USAGE.md`

| Module | Capability |
|---|---|
| Search | Keyword presets → Google Search / Maps |
| Scan | Auto-capture from Maps, Places tab, organic results |
| Enrich | GMB panel + website deep scan (email, phone, owner, tech stack) |
| Score | 0–100 with Hot/Warm/Cold priority |
| Export | 75+ column Excel; `crmSyncStatus` field already exists |
| Detect | Chat widget provider (Intercom, Tawk, Tidio…) — sales intel |

**Stack:** Chrome extension (React + Vite), in-memory session storage only.

**Integration value:** Top-of-funnel for Flow CRM. Hot leads flow in automatically instead of manual CSV import.

---

## 5. Target architecture (future)

```
                         ┌──────────────┐
                         │   FlowAuth   │
                         └──────┬───────┘
                                │ SSO / API keys
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
 │ LeadSnapper │──API──▶│  Flow CRM   │◀──API──│     DAS     │
 │  (extension)│        │  contacts   │        │  documents  │
 └─────────────┘        └──────┬──────┘        └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  FlowChat   │
                        │ conversations│
                        └─────────────┘
                               │
                               ▼
                    Neon PostgreSQL (shared platform DB)
                    + product-specific schemas/services
```

---

## 6. Integration phases (future work)

### Phase 0 — Now (manual)

| Flow | Method |
|---|---|
| LeadSnapper → CRM | Export Excel → manual CSV import into Flow CRM |
| CRM → DAS | Manually create DAS client from CRM contact |
| Chat → DAS | Copy client details; build quote separately |
| Auth | Separate login per product |

**Effort:** Zero engineering. Works today.

---

### Phase 1 — LeadSnapper → Flow CRM (highest ROI)

**Goal:** Push Hot/Warm leads into CRM without Excel.

| ID | Work | Owner |
|---|---|---|
| LS-1 | Flow CRM API: `POST /crm/contacts/import` (single + bulk) | Flow CRM |
| LS-2 | Map `ScanLead` fields → contact schema (name, email, phone, company, custom attrs) | LeadSnapper |
| LS-3 | Extension: "Sync to Flow CRM" button; set `crmSyncStatus: synced` | LeadSnapper |
| LS-4 | Store lead score, priority, Google rating as custom attributes | Flow CRM |
| LS-5 | Dedupe by email / domain / company number | Flow CRM |

**Trigger:** After Flow CRM MVP (Sprint 6 or pulled forward).

**Data mapping (sample):**

| LeadSnapper | Flow CRM contact |
|---|---|
| `businessName` | `name` / company name |
| `primaryEmail` | `email` |
| `primaryPhone` | `phone` |
| `city`, `address` | `city`, location fields |
| `leadScore`, `priority` | custom attributes |
| `ownerName`, `ownerLinkedIn` | contact note or linked person |
| `website`, `domain` | custom attributes |
| `chatWidget` | custom attribute (sales signal) |

---

### Phase 2 — Flow CRM ↔ DAS

**Goal:** One client record; quote from CRM.

| ID | Work | Owner |
|---|---|---|
| DA-1 | Shared client ID or external reference (`crm_contact_id` on DAS clients) | Both |
| DA-2 | Flow CRM: "Create quotation" action → deep link or API call to DAS | Flow CRM |
| DA-3 | DAS: pull client + contacts from Flow CRM API when creating document | DAS |
| DA-4 | DAS document list visible on CRM contact profile | Flow CRM |
| DA-5 | Align `brands` (DAS) with `accounts` (Flow platform) | Platform |

**Trigger:** After DAS production deploy (Supabase) + Flow CRM contacts CRUD.

---

### Phase 3 — FlowChat ↔ Flow CRM ↔ DAS

**Goal:** Conversation context + documents in one place.

| ID | Work | Owner |
|---|---|---|
| FC-1 | Contact sidebar in conversation view (CRM data) | FlowChat |
| FC-2 | Conversation history on CRM contact profile | Flow CRM |
| FC-3 | "Send quotation" from chat — attach DAS PDF link or open DAS builder | FlowChat + DAS |
| FC-4 | Widget pre-chat form creates CRM contact automatically | FlowChat |
| FC-5 | LeadSnapper-detected "no chat widget" → FlowChat outreach campaign list | LeadSnapper + CRM |

**Trigger:** After FlowChat Sprint 3–5 (basic chat + lifecycle).

---

### Phase 4 — FlowAuth unification

**Goal:** One login across all products.

| ID | Work | Owner |
|---|---|---|
| FA-1 | Extract `services/auth` (see `auth-service-plan.md`) | FlowAuth |
| FA-2 | FlowChat + Flow CRM consume FlowAuth SDK | Platform |
| FA-3 | DAS migrates from local auth → FlowAuth | DAS |
| FA-4 | LeadSnapper extension OAuth token for CRM sync API | LeadSnapper |
| FA-5 | Org-level API keys for extension → CRM import | FlowAuth |

**Trigger:** After FlowAuth MVP (3-week plan in `auth-service-plan.md`).

---

### Phase 5 — Unified platform (optional, long-term)

| ID | Work |
|---|---|
| PL-1 | Mutex hub dashboard — app switcher: Chat, CRM, DAS, LeadSnapper |
| PL-2 | Shared `accounts` / workspace across all products |
| PL-3 | Unified billing (Mutex SaaS plans) |
| PL-4 | Event bus: `lead.synced`, `document.finalized`, `conversation.resolved` |
| PL-5 | AI layer across products (proposal draft in DAS, reply suggest in Chat) |

---

## 7. Recommended build order (ecosystem-aware)

```
Now          Next 4 weeks        Next 8 weeks         Future
─────────────────────────────────────────────────────────────────
FlowAuth     FlowChat S3         LeadSnapper→CRM API   DAS↔CRM
(extract)    Flow CRM MVP        (Phase 1)             (Phase 2)
Sprint 2 ✅  Widget + contacts   Extension sync btn    Chat↔DAS
```

**Do not integrate until:**
1. Flow CRM has contacts CRUD (import target exists)
2. FlowAuth or stable API keys exist (extension + DAS need auth)
3. DAS is on shared Postgres or exposes a stable API (not SQLite-only)

---

## 8. API contracts (sketch — future)

### LeadSnapper → Flow CRM

```http
POST /v1/crm/contacts/import
Authorization: Bearer <flowauth_token_or_api_key>
Content-Type: application/json

{
  "source": "leadsnapper",
  "leads": [{
    "businessName": "Acme Ltd",
    "email": "info@acme.com",
    "phone": "+44...",
    "website": "https://acme.com",
    "city": "London",
    "leadScore": 78,
    "priority": "Hot",
    "ownerName": "John Smith",
    "customAttributes": {
      "googleRating": 4.5,
      "chatWidget": "Intercom",
      "techStack": "WordPress"
    }
  }]
}
```

### Flow CRM → DAS

```http
POST /v1/documents/quotations
Authorization: Bearer <token>
X-CRM-Contact-Id: <contact_uuid>

{ "clientId": "<das_client_or_auto_provision>", "lineItems": [...] }
```

### FlowChat → CRM (contact from conversation)

```http
POST /v1/crm/contacts
{ "email": "...", "source": "web_widget", "inboxId": "..." }
```

---

## 9. What stays separate (by design)

| Keep separate | Reason |
|---|---|
| LeadSnapper as Chrome extension | Different runtime; can't merge into web app |
| DAS PDF generation service | Heavy Playwright workload; optional separate deploy |
| FlowAuth as own service | Sellable product; multiple consumers |
| LeadSnapper in-memory sessions | Privacy + extension model; sync out, don't centralize scan state |

---

## 10. Risk & decisions

| Decision | Recommendation |
|---|---|
| One database or many? | **One Neon project**, separate schemas per product initially; merge `contacts`/`clients` later |
| DAS SQLite → ? | Migrate DAS to Neon or Supabase before CRM sync (Phase 2 blocker) |
| LeadSnapper auth | Extension uses FlowAuth device/API token; no password in extension |
| Brand vs account | Map DAS `brands` = Flow `accounts`; document in platform schema |
| Who owns contacts? | **Flow CRM** is system of record; DAS and FlowChat reference `contact_id` |

---

## 11. Summary

| Layer | Name | Role |
|---|---|---|
| **Product** | **Flow** | Unified platform customers buy |
| **Modules** | FlowChat, Flow CRM | Messaging + CRM inside Flow |
| **Service** | FlowAuth | Identity for Flow and external apps |
| **Siblings** | DAS, LeadSnapper | Documents + prospecting; integrate with Flow |

**Short term:** Build Flow modules (FlowChat Sprint 3, Flow CRM) in the `Flowchat` repo under one app with module switcher.  
**Medium term:** LeadSnapper → Flow CRM sync.  
**Long term:** DAS + FlowAuth + unified Flow workspace.

UI implication: sidebar app switcher shows **FlowChat | Flow CRM** (modules), not separate products.

---

*Related docs:*
- [`auth-service-plan.md`](./auth-service-plan.md) — FlowAuth extraction
- [`sprints.md`](./sprints.md) — FlowChat 20-sprint plan
- [`../das/docs/SPEC.md`](../../das/docs/SPEC.md) — DAS specification
- [`../leadsnapper/USAGE.md`](../../leadsnapper/USAGE.md) — LeadSnapper usage
