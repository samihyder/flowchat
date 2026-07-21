# Flow CRM — Documents module (DAS)

> Document automation inside Flow CRM: quotations, invoices, proposals, SLAs, NDAs.  
> Former standalone **DAS / Signum** app is merged into this monorepo.  
> **Last updated:** 2026-07-21

---

## Positioning

| Item | Value |
|------|--------|
| **Product** | Flow CRM (inside the Flow platform repo) |
| **Module name** | Documents |
| **Legacy name** | DAS (Document Automation System) / Signum |
| **UI path** | `/dashboard/documents` |
| **Nav** | CRM → Documents |
| **Tenancy** | FlowChat `accounts.id` (`account_id`) — same as Contacts and Marketing |
| **Auth** | FlowChat sessions (`fc_session` / Bearer) — no separate Documents login |

**Customer journey:** Lead / contact in Flow CRM → create document → approve / finalize → verify / PDF → optional WhatsApp or email outreach.

---

## Architecture

```
apps/web
├── src/app/(dashboard)/dashboard/documents/     # list + detail UI
├── src/app/api/accounts/[accountId]/das/       # account-scoped APIs
└── src/lib/das/                                 # types and domain helpers

packages/db/drizzle/0040_das_documents.sql       # Postgres schema (das_*)
```

| Concern | Location |
|---------|----------|
| Schema migration | `packages/db/drizzle/0040_das_documents.sql` |
| Drizzle journal | `packages/db/drizzle/meta/_journal.json` (`0040_das_documents`) |
| List / create API | `GET/POST …/api/accounts/[accountId]/das/documents` |
| Detail API | `GET …/api/accounts/[accountId]/das/documents/[documentId]` |
| Client SDK | `api.das.documents.*` in `apps/web/src/lib/api.ts` |
| Types | `apps/web/src/lib/das/types.ts`, `DasDocument` in `api.ts` |

**Do not** run a nested Next.js app for Documents. All UI and APIs live in `apps/web` and share FlowChat Postgres.

---

## Data model

All tables use prefix `das_` and scope by `account_id → accounts(id)`.

| Table | Purpose |
|-------|---------|
| `das_brand_profiles` | Legal / letterhead settings per account (1:1 with `accounts`) |
| `das_assets` | Stamps, seals, signatures, logos (storage keys / URLs) |
| `das_clients` | Optional catalog parties; prefer linking `contact_id` → Flow `contacts` |
| `das_products` / `das_services` | Catalog with SKU, price, currency, fixed/rollup |
| `das_catalog_components` | Nested product/service bundles |
| `das_catalog_prices` | Extra currency prices |
| `das_templates` | Document templates (type, Handlebars HTML, body JSON) |
| `das_documents` | Document records (type, status, structured data, HTML snapshot) |
| `das_document_security` | Hash, verification token, QR payload, signature metadata |
| `das_audit_logs` | Document/entity audit trail |

### Document types

`quotation` · `invoice` · `proposal` · `sla` · `nda` · `other`

### Document statuses

`draft` · `pending_approval` · `approved` · `rejected` · `finalized` · `archived`

### Identity mapping (legacy DAS → Flow)

| Legacy DAS | Flow CRM |
|------------|----------|
| `brands` | `accounts` (+ optional `das_brand_profiles`) |
| `brand_members` / DAS `users` | `account_users` / `users` |
| `clients` | Prefer `contacts`; optional `das_clients` with `contact_id` |
| `documents.contact_id` | FlowChat `contacts.id` |

**System of record for people:** Flow CRM `contacts`. Documents reference `contact_id` when linked.

---

## Apply schema

```bash
# From FlowChat repo root, with DATABASE_URL pointing at Flow Postgres
psql "$DATABASE_URL" -f packages/db/drizzle/0040_das_documents.sql
```

Confirm:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'das_%'
ORDER BY 1;
```

---

## Current product surface

### Implemented

- Account-scoped document list (search by title)
- Create draft document (type + title)
- Document detail view
- CRM sidebar entry **Documents**
- Audit log row on create
- Optional `contact_id` validation against account contacts

### Module capability set (full Documents feature surface)

Use this as the CRM Documents checklist (ported from the former DAS product):

**Company profile & assets**
- Legal / company profile for templates  
- Logo and letterhead  
- Stamp, seal, signature, initials assets  
- Signer name / title metadata  

**Catalog**
- Products and services with SKU (auto or manual)  
- Unit, currency, fixed or roll-up pricing  
- Nested components and multi-currency prices  

**Templates**
- Types: quotation, invoice, proposal, SLA, NDA, other  
- Handlebars HTML and structured body  
- Versioning and active flag  

**Documents & workflow**
- Draft → pending approval → approved / rejected → finalized → archived  
- Structured line data + HTML snapshot  
- Submit / approve / reject with actors  
- Finalize with content hash  
- Public verification token and QR payload  
- On-demand PDF (store hash and snapshot; PDF generation is compute-bound)  

**Clients (optional)**
- Catalog clients when not yet a Flow contact  
- Link to Flow `contacts` when available  

---

## API reference (account-scoped)

Base: `/api/accounts/:accountId/das`

Auth: `Authorization: Bearer <session token>` and membership on `accountId`.

### `GET /documents`

Query: `q`, `status`, `type`, `limit`, `offset`

Response: `{ documents: DasDocument[], total: number }`

### `POST /documents`

Body:

```json
{
  "type": "quotation",
  "title": "Q3 proposal",
  "contactId": null,
  "templateId": null,
  "structuredData": {}
}
```

Response: `{ document: DasDocument }` (201)

### `GET /documents/:documentId`

Response: `{ document: DasDocument }`

---

## UI

| Route | Purpose |
|-------|---------|
| `/dashboard/documents` | List, search, create draft |
| `/dashboard/documents/[documentId]` | Detail |

Middleware already protects `/dashboard/*` via FlowChat session.

---

## Environment

Documents use existing FlowChat variables:

- `DATABASE_URL` — Postgres (required)  
- Session / JWT secrets already used by FlowChat  
- Object storage (`R2_*` or equivalent) — for assets when upload is wired  
- PDF generation may use a worker process (same monorepo `services/worker` pattern)

No separate Documents `SESSION_SECRET` or SQLite path.

---

## Related docs

- [ecosystem-plan.md](ecosystem-plan.md) — Flow modules and siblings (Documents is in-repo)  
- [email-marketing-standard.md](email-marketing-standard.md) — Marketing module pattern  
- Migration: `packages/db/drizzle/0040_das_documents.sql`  

---

## Cleanup note

The nested legacy app previously at `FlowChat/das/` (standalone Next.js + SQLite) has been removed. This document and the paths above are the source of truth.
