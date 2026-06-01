# FlowChat

> *Every conversation in flow.*

FlowChat is a modern, omnichannel customer communication platform. This repository contains the product specification, design system, and technical architecture reference for building FlowChat.

---

## Contents

| File | Description |
|---|---|
| [docs/features.md](docs/features.md) | Complete feature specification — 15 modules covering all platform capabilities |
| [docs/branding.md](docs/branding.md) | Color palette, typography, spacing, motion — full design system |
| [docs/tech-stack.md](docs/tech-stack.md) | Recommended tech stack with architecture diagram and rationale |
| [docs/logo.svg](docs/logo.svg) | Horizontal wordmark (indigo + dark) |
| [docs/icon.svg](docs/icon.svg) | Square app icon (indigo gradient + teal live-dot) |

---

## Brand at a Glance

| Token | Hex | Use |
|---|---|---|
| Primary | `#6366F1` | Buttons, links, active states |
| Accent | `#14B8A6` | Online status, success, AI highlights |
| Heading | `#111827` | Page headings |
| Body | `#374151` | Paragraph text |

---

## Tech Stack Summary

| Layer | Choice |
|---|---|
| Web App | Next.js 15 + React 19 + Tailwind v4 + shadcn/ui |
| Mobile | Expo + React Native |
| Widget | Vanilla TypeScript (Vite) |
| API | Hono + Bun |
| Database | PostgreSQL 16 + Drizzle ORM + pgvector |
| Real-time | Bun WebSocket + Redis pub/sub |
| AI | Vercel AI SDK (OpenAI / Anthropic / Gemini) |
| Search | Typesense |
| Infra | Vercel + Railway + Neon + Cloudflare R2 |

---

## Channels Supported

Web Live Chat · Email · WhatsApp · Facebook Messenger · Instagram · Telegram · SMS · TikTok · LINE · API Channel

---

*Built by [Mutex Systems](https://mutexsystems.com)*
