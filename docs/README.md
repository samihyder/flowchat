# FlowChat — Development Reference

> Product design documents for building FlowChat, a modern customer conversation platform derived from the Chatwoot feature set.

---

## Contents

| File | Description |
|---|---|
| [sprints.md](sprints.md) | Sprint plan — Phases 1–8, story points, definitions of done |
| [chat-module-standard.md](chat-module-standard.md) | Industry-standard web chat checklist — **gate before CRM (Sprint 6)** |
| [email-marketing-standard.md](email-marketing-standard.md) | Email marketing automation checklist — **Sprint 6 module** |
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

---

*Generated: 2026-06-01*
