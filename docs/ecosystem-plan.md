# Mutex Product Ecosystem — Integration Plan

> How **Flow** (platform), its modules, and sibling products fit together.  
> **Last updated:** 2026-07-21

---

## Product hierarchy

```
Flow                          ← customer-facing platform (this monorepo)
├── FlowChat                  ← messaging, inbox, widget, channels
├── Flow CRM                  ← contacts, companies, marketing, documents
│   ├── Contacts
│   ├── Marketing (email campaigns)
│   └── Documents (former DAS)   ← quotations, invoices, proposals, PDF/verify
└── Shared platform           ← accounts, auth, teams, settings, APIs

Ecosystem siblings (separate apps, SSO / API into Flow):
├── WhatsApp CRM              ← wa-automation
├── Lead Monitor              ← keyword_automation
└── LeadSnapper               ← browser extension (lead capture)

FlowAuth                      ← identity/MFA (platform + sellable service)
```

**Flow** is one product with multiple modules. **FlowChat** is the messaging module; the repo name is legacy. **Documents** (legacy product name **DAS**) is an in-repo Flow CRM module — not a sibling deploy.

---

## 1. Portfolio overview

### Inside Flow (this monorepo)

| Module | Paths | What it does |
|--------|--------|----------------|
| **FlowChat** | `/dashboard`, widget, WS | Inbox, conversations, channels, real-time chat |
| **Flow CRM — Contacts** | `/dashboard/contacts` | Contacts, companies, enrichment, labels |
| **Flow CRM — Marketing** | `/marketing/*` | Email campaigns, segments, templates |
| **Flow CRM — Documents** | `/dashboard/documents`, `das_*` | Quotes, invoices, proposals, SLAs, NDAs |
| **Shared platform** | auth, accounts, teams, settings | Multi-tenant SaaS foundation |

### Ecosystem siblings

| Product | Role | Integration |
|---------|------|-------------|
| **WhatsApp CRM** | Shared WA inbox, pipelines, broadcasts | SSO + contact sync API |
| **Lead Monitor** | Intent scanning, verify leads | SSO + lead sync into Flow CRM |
| **LeadSnapper** | Lead capture extension | Inbound API into Flow CRM |
| **FlowAuth** | Identity / MFA | Planned shared identity |

Journey: **find leads → manage in Flow CRM → communicate (chat / WhatsApp / email) → close with Documents**.

---

## 2. Customer journey

```
  Lead Monitor /      Flow CRM           FlowChat /          Documents
  LeadSnapper    →    Contacts       →   WhatsApp / email →  (quotes/invoices)
       │                  │                   │                   │
   Discover &         Qualify &            Outreach            Finalize &
   verify             enrich               & support           verify PDF
```

| Stage | Where | User action |
|-------|--------|-------------|
| **1. Prospecting** | Lead Monitor / LeadSnapper | Scan, score, sync to Flow |
| **2. CRM** | Flow CRM Contacts | Import / enrich contact |
| **3. Outreach** | FlowChat + WhatsApp CRM + Marketing | Chat, WhatsApp, email campaigns |
| **4. Close** | Flow CRM Documents | Quotation / invoice from contact |
| **5. Identity** | FlowAuth | SSO across Flow + siblings |

---

## 3. Shared concepts

| Concept | FlowChat / Flow CRM | Documents module | Lead Monitor / Snapper |
|---------|---------------------|------------------|-------------------------|
| Workspace | `accounts` | same `account_id` | org / settings |
| Customer | `contacts` / companies | `das_documents.contact_id` → `contacts` | lead → contact |
| Brand assets | Account logo (object storage) | `das_assets`, `das_brand_profiles` | — |
| Catalog | — | `das_products`, `das_services` | — |
| Documents | CRM Documents UI | `das_documents`, `das_document_security` | — |
| Auth | `users` + sessions | same (no separate login) | sibling SSO / API keys |

**System of record for people:** Flow CRM `contacts`. Documents reference `contact_id`.

---

## 4. Documents module (former DAS)

**Canonical doc:** [crm-documents-module.md](crm-documents-module.md)

| Area | Detail |
|------|--------|
| Schema | `packages/db/drizzle/0040_das_documents.sql` |
| UI | `/dashboard/documents` |
| API | `/api/accounts/[accountId]/das/documents` |
| Types | quotation, invoice, proposal, sla, nda, other |
| Statuses | draft → pending_approval → approved/rejected → finalized → archived |

Legacy standalone DAS (SQLite, own auth, `brands` tenancy) has been **removed** from this repo. Do not restore a nested Next app under `das/`.

---

## 5. Integration patterns

### Lead Monitor / LeadSnapper → Flow CRM

- Live API keys (`fc_live_…`)  
- `POST` lead/contact inbound routes  
- Contact custom attributes for source metadata  

### Flow CRM → WhatsApp CRM

- Account integrations (`whatsapp_crm`)  
- Contact push when phone present and sync enabled  
- Sidebar SSO handoff  

### Flow CRM Documents ↔ Contacts

- Create document with optional `contact_id`  
- List documents filtered by account (and later by contact on profile)  
- Same `authorizeAccount` gate as Contacts  

---

## 6. Who owns what

| Data | Owner |
|------|--------|
| Contacts / companies | Flow CRM |
| Conversations / widget | FlowChat |
| Email campaigns | Flow CRM Marketing |
| Quotes / invoices / verify | Flow CRM Documents |
| WhatsApp threads / pipelines | WhatsApp CRM (sibling) |
| Intent leads pre-CRM | Lead Monitor (sibling) |

---

## Related docs

- [crm-documents-module.md](crm-documents-module.md) — Documents module reference  
- [email-marketing-standard.md](email-marketing-standard.md) — Marketing  
- [chat-module-standard.md](chat-module-standard.md) — Live chat gate  
- [MUTEX_SYSTEMS_SETUP.md](MUTEX_SYSTEMS_SETUP.md) — Operator setup  

---

## Summary

| Layer | Products |
|-------|----------|
| **Flow (this repo)** | FlowChat + Flow CRM (Contacts, Marketing, **Documents**) |
| **Siblings** | WhatsApp CRM, Lead Monitor, LeadSnapper |
| **Platform service** | FlowAuth |
