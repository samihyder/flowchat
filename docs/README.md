# FlowChat — Development Reference

> Product design documents for FlowChat / Flow CRM — the Flow platform monorepo.

---

## Contents

| File | Description |
|---|---|
| [crm-documents-module.md](crm-documents-module.md) | **Flow CRM Documents** (former DAS) — schema, API, UI, tenancy |
| [ecosystem-plan.md](ecosystem-plan.md) | Flow modules + sibling products (WhatsApp CRM, Lead Monitor) |
| [sprints.md](sprints.md) | Sprint plan — Phases 1–8, story points, definitions of done |
| [chat-module-standard.md](chat-module-standard.md) | Industry-standard web chat checklist — **gate before CRM (Sprint 6)** |
| [email-marketing-standard.md](email-marketing-standard.md) | Email marketing checklist — **S6M campaign model** |
| [marketing-module-design.md](marketing-module-design.md) | **S6M visual design** — branding, components, all 44 stories |
| [marketing-module-screens.md](marketing-module-screens.md) | S6M screen behaviour, API, enums |
| [marketing-module-migration.md](marketing-module-migration.md) | Planned DB schema for S6M campaigns |
| [features.md](features.md) | Complete feature specification — channels, conversations, AI, reports, auth, API |
| [branding.md](branding.md) | Color palette, typography, spacing, motion — full design system |
| [tech-stack.md](tech-stack.md) | Recommended modern tech stack with rationale |
| [logo.svg](logo.svg) | Full horizontal wordmark (indigo + dark) |
| [icon.svg](icon.svg) | Square app icon (indigo gradient + teal live-dot) |

---

## Quick Reference

### Brand Colors
| Token | Hex | Use |
|---|---|---|
| `primary` | `#6366F1` | Buttons, links, active states |
| `accent` | `#14B8A6` | Online status, success, AI highlights |
| `heading` | `#111827` | Page/section headings |
| `body` | `#374151` | Paragraph text |

### Core Tech
| Layer | Choice |
|---|---|
| Web frontend | Next.js 15 + React 19 + Tailwind v4 + shadcn/ui |
| Mobile | Expo + React Native |
| Widget | Vanilla TypeScript (Vite bundle) |
| API | Hono + Bun |
| Database | PostgreSQL 16 + Drizzle ORM |
| Real-time | Bun WebSocket + Redis pub/sub |
| AI | Vercel AI SDK (OpenAI / Anthropic / Gemini) |
| Search | Typesense |

### Flow CRM modules (in this repo)
| Module | Path |
|--------|------|
| Contacts | `/dashboard/contacts` |
| Documents | `/dashboard/documents` |
| Marketing | `/marketing/campaigns` |

---

*Updated: 2026-07-21*
