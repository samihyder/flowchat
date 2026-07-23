# LeadSnapper

Chrome Manifest V3 extension for capturing, scoring, enriching, and exporting **local SMB** and **B2B** leads from Google Search, Google Maps, business websites, and LinkedIn.

Built for sales teams: scan Google Places/Maps businesses, look up UK register data and owner contacts, qualify leads, and export to Excel — all from a React side panel.

**Version:** 1.0.0  
**Last updated:** June 2026

---

## Table of contents

- [What it does](#what-it-does)
- [Who it is for](#who-it-is-for)
- [Quick start (sales)](#quick-start-sales)
- [Sales workflow](#sales-workflow)
- [Owner lookup & APIs](#owner-lookup--apis)
- [Scanning & enrichment](#scanning--enrichment)
- [Side panel tabs](#side-panel-tabs)
- [Lead scoring](#lead-scoring)
- [Export](#export)
- [Installation](#installation)
- [Development & build](#development--build)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Configuration & API keys](#configuration--api-keys)
- [Troubleshooting](#troubleshooting)
- [Documentation index](#documentation-index)
- [Roadmap](#roadmap)
- [Security notes](#security-notes)
- [Tech stack](#tech-stack)

---

## What it does

| Capability | Description |
|------------|-------------|
| **Scan** | Capture local businesses from Google Maps, Search local pack, and Places tab |
| **Enrich** | Deep-scan websites and Google Business Profile pages in background tabs |
| **Score** | 0–100 lead score with Hot / Warm / Cold priority |
| **Owner lookup** | UK: Companies House → Openmart → Cognism · US: Openmart → Lusha |
| **Pipeline** | Save, qualify, assign status, add notes |
| **Export** | Excel (`.xlsx`) with 75+ columns |

**Current focus:** Local SMB (restaurants, shops, Maps leads).  
**Planned:** Corporate / enterprise mode (Google person/company search, LinkedIn, website-first flow) — see [Roadmap](#roadmap).

---

## Who it is for

| Audience | How they use LeadSnapper |
|----------|--------------------------|
| **Sales team** | Load pre-built `extension/dist` — no `npm` required |
| **Developers** | Build from `extension/`, distribute `dist/` to sales |
| **UK local SMB** | Companies House register + Openmart + Cognism mobile |
| **US local SMB** | Openmart owner data + Lusha mobile fallback |
| **Corporate B2B** | Turn Local SMB mode OFF → PDL / Explorium (advanced) |

---

## Quick start (sales)

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `extension/dist` folder
3. Click the **LeadSnapper** toolbar icon to open the side panel
4. **Find** tab → pick a preset → open Google Maps or Search → click **Scan**
5. **Results** tab → expand a lead → **Owner** tab → **Find owner mobile**
6. Select leads → **Add to Pipeline** → **Export**

> Do **not** load the `extension/` source folder — only `extension/dist`.

---

## Sales workflow

```
Find → Scan → Results → Owner lookup → Pipeline → Export
```

| Step | Tab | Action |
|------|-----|--------|
| 1 | **Find** | Preset / keyword → open Google or Maps → scroll to local results |
| 2 | **Find** | Click **Scan** or **Scan Current Page** |
| 3 | **Results** | Review scores → expand row → **Owner** tab → run lookup |
| 4 | **Results** | Select leads → **Add to Pipeline** |
| 5 | **Pipeline** | Status, notes, assignment → **Export** |

**Scan behaviour**

- Manual scan only — click **Scan** or **Load more** (no auto-scan on panel open or scroll)
- Re-scan merges new cards; existing enrichment is preserved
- Captures **Places / Maps businesses only** — not blogs, Yelp, TripAdvisor, or listicles

Detailed workflow: [docs/WORKFLOW.md](docs/WORKFLOW.md)

---

## Owner lookup & APIs

### Local SMB mode (default ON)

For restaurants, shops, and Google Maps leads.

| Market | Waterfall |
|--------|-----------|
| **UK** | **Companies House** → **Openmart** → **Cognism** (mobile fallback) |
| **US** | **Openmart** → **Lusha** (mobile fallback) |

Turn **Local SMB mode OFF** in Settings for corporate B2B (PDL / Explorium direct modes).

### CH test mode (Settings — amber toggle)

Companies House **only** — skips Openmart, Cognism, and Lusha. Use to verify UK register data before live outreach.

### Provider summary

| Provider | Role | Market |
|----------|------|--------|
| **Companies House** | UK company, director, PSC, registered address (free) | UK |
| **Openmart** | `find_people` — owner name, title, mobile, LinkedIn | UK / US |
| **Cognism** | Verified mobile / email when Openmart has no number | UK |
| **Lusha** | Mobile / email when Openmart has no number | US |
| **People Data Labs** | Owner name, work email, LinkedIn (B2B mode) | Global |
| **Explorium** | Owner name, email, phone (B2B mode) | UK / EU |

### Companies House (UK) — one key, four endpoints

Register free at [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk/).

| # | Endpoint | Returns |
|---|----------|---------|
| 1 | `GET /search/companies` | Company name + number |
| 2 | `GET /company/{number}/officers` | Director name + role |
| 3 | `GET /company/{number}/persons-with-significant-control` | PSC (beneficial owner) |
| 4 | `GET /company/{number}/registered-office-address` | Registered office |

**Auth:** HTTP Basic — API key as username, blank password.

**Owner tab fields** (auto-filled, editable): registered company, company no., status, registered office, director, director role, PSC, primary owner, mobile/email from Cognism when found.

**Openmart contacts** — all people returned by `find_people` are shown in the Owner tab (name, title, mobile, grade, LinkedIn).

---

## Scanning & enrichment

### Supported Google pages

| Page | What gets scanned |
|------|-------------------|
| Google Maps search | All result cards in the list panel |
| Google Search — Places tab (`tbm=lcl`) | Business cards in split-view panel |
| Google Search — local pack | Map sidebar / 3-pack (`hfpxzc`, `data-cid`, Maps links) |

### Per-business deep scan (after card capture)

1. **Card scan** — name, category, address, rating, reviews, phone, hours, website, Maps URL
2. **GMB place page** — background tab reads full Google Business Profile panel
3. **Website scan** — emails, phones, WhatsApp, social, tech stack, chat widget, booking/ordering, owner/team from Schema.org and about pages

### Single-page capture

Use the **camera icon** in the panel header on any open tab:

- Business website
- LinkedIn profile or company page
- Google Search results page (organic SERP links)

Captured data appears in the **Capture** tab → save to **Pipeline**.

### Website intelligence detected

Contact forms, online ordering, booking systems, tech stack (WordPress, Shopify, HubSpot, etc.), chat widgets (Intercom, Drift, Tidio, etc.), business listings (Yelp, Trustpilot, Clutch, etc.), company registration mentions, trademarks, DUNS.

---

## Side panel tabs

| Tab | Purpose |
|-----|---------|
| **Find** | Presets, keywords, filters, open Google/Maps, **Scan Current Page** |
| **Results** | Scanned leads, owner lookup, **Add to Pipeline**, Excel export |
| **Capture** | Single-page capture from active tab (camera icon) |
| **Pipeline** | Saved leads — status, assignment, enrich, export |
| **Export** | Session export by priority, brand, or CRM sync status |
| **Settings** | Brands, keywords, presets, **Local SMB API Keys**, CH endpoints, CH test mode |

Default brands: **Mutex Systems**, **NexusCorp-Ltd**. Presets cover UK/US restaurants, construction, e-commerce, cybersecurity, Oracle/Unifier targets.

---

## Lead scoring

Score range **0–100**. Priority: **Hot** ≥ 70 · **Warm** 40–69 · **Cold** &lt; 40.

| Signal | Points |
|--------|--------|
| Phone, website, email, LinkedIn | +10 each |
| WhatsApp, social presence | +5 |
| No chat widget / no booking (sales opportunity) | +10 |
| Restaurant with no online ordering | +15 |
| Google reviews &gt; 50 / &gt; 100, rating signals | +5 each |
| Restaurant / e-commerce / construction / cyber industry match | +20–40 |
| Owner or director name found | +10 |

---

## Export

- **Results tab** — select leads → **Export X Selected → Excel**
- **Export tab** — all, Hot only, Warm only, by brand, by CRM sync status
- **75+ columns** across Leads + Summary sheets
- Includes CH fields: Director Role, PSC, Registered Company, Registered Office, Company Status
- Includes Openmart contacts and API mobile source

Session data is **in-memory only** — cleared when the browser closes.

---

## Installation

### Sales team (production)

```
chrome://extensions → Developer mode → Load unpacked → extension/dist
```

### Developers (from source)

```bash
cd extension
npm install
npm run build
```

Then reload the extension in `chrome://extensions` and reopen the side panel.

---

## Development & build

| Command | Description |
|---------|-------------|
| `npm run build` | Production build → `extension/dist/` |
| `npm run dev` | Watch mode (rebuild on change) |
| `npm run export-ch-key` | Export saved CH key into built-in config (optional) |

**After every code change:**

1. `npm run build`
2. Reload extension in `chrome://extensions`
3. Close and reopen the side panel

**Distribute to sales:** copy or share the `extension/dist/` folder only.

### CH API test script

```bash
cd extension
node scripts/test-ch-api.mjs
```

---

## Project structure

```
LeadSnapper/
├── README.md                 ← this file
├── USAGE.md                  ← full user guide
├── CHANGELOG.md              ← release history
├── product-features.txt      ← complete feature inventory
├── docs/
│   └── WORKFLOW.md           ← sales workflow & CH reference
└── extension/
    ├── dist/                 ← built extension (load this in Chrome)
    ├── manifest.json
    ├── package.json
    ├── scripts/
    │   ├── test-ch-api.mjs
    │   └── export-ch-key.mjs
    └── src/
        ├── background/
        │   ├── worker.ts     ← scan, enrichment APIs, waterfall
        │   └── enricher.ts   ← GMB + website background enrichment
        ├── content/
        │   └── extractor.ts  ← Google Maps/Search scan + page extract
        ├── sidepanel/        ← React UI (tabs, Owner panel)
        ├── export/           ← Excel exporters
        ├── scoring/          ← lead scoring rules
        ├── types/            ← TypeScript models
        ├── utils/
        │   ├── companiesHouse.ts
        │   ├── openmart.ts   ← find_people response parser
        │   └── storage.ts
        └── config/
            └── builtin-keys.ts
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Chrome Side Panel (React + Vite)                           │
│  Find · Results · Capture · Pipeline · Export · Settings    │
└──────────────────────────┬──────────────────────────────────┘
                           │ chrome.runtime messages / port
┌──────────────────────────▼──────────────────────────────────┐
│  Background Service Worker (worker.ts)                      │
│  · SCAN_PAGE / EXTRACT_PAGE / ENRICH_LEAD                   │
│  · EXPLORIUM_ENRICH → waterfall (CH / Openmart / Cognism)   │
│  · GMB + website enrichment queue (enricher.ts)             │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
┌──────────────▼──────────┐   ┌────────────▼─────────────────┐
│  Content Script          │   │  External APIs               │
│  extractor.ts            │   │  Companies House, Openmart,  │
│  · Maps / Places scan    │   │  Cognism, Lusha, PDL,       │
│  · Website / LinkedIn      │   │  Explorium                   │
│    page extract          │   └──────────────────────────────┘
└──────────────────────────┘
```

**Storage:** `chrome.storage.local` — settings, brands, presets, keyword groups, API keys, search history.

**Modes:**

| Mode | When active | Behaviour |
|------|-------------|-----------|
| Local SMB ON | Default | UK/US waterfall; CH auto-enabled for UK |
| CH test mode | Settings toggle | CH four endpoints only |
| Local SMB OFF | Settings | PDL / Explorium / auto waterfall for B2B |

---

## Configuration & API keys

**Settings → Local SMB API Keys**

Each provider has: masked key field, Show/Hide, **Test** button, enable toggle.

| Setting | Description |
|---------|-------------|
| **Local SMB mode** | ON = Maps/SMB waterfall (default) |
| **CH test mode** | Amber toggle — register lookup only |
| **CH endpoints** | Search, officers, PSC, address (auto-enabled in test/live SMB mode) |
| **UK Companies House** | Free API key — pre-filled in sales builds |
| **Openmart** | SMB `find_people` batch API |
| **Cognism** | UK mobile redeem |
| **Lusha** | US mobile search + enrich |

CH key override: paste in Settings → **Test** (expect four ✓ lines for search, officers, PSC, address).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No businesses on scan | Scroll to local pack / Places tab / open Google Maps → Scan again |
| CH “disabled in Settings” | Enable **CH test mode** or **Local SMB mode** |
| CH “API key missing” | Reload extension; Settings → UK Companies House → Test |
| CH works, no mobile | Expected in CH test mode — disable test mode, add Cognism (UK) |
| Openmart returns data in dashboard but not plugin | Reload latest `dist` (parser fix for `phone_number` / `line_type`) |
| Extension not updating | `npm run build` → refresh card in `chrome://extensions` → reopen panel |
| Scan loads wrong folder | Must load `extension/dist`, not `extension/` |

More detail: [docs/WORKFLOW.md#troubleshooting](docs/WORKFLOW.md#troubleshooting)

---

## Documentation index

| Document | Contents |
|----------|----------|
| [README.md](README.md) | Overview, install, architecture, quick reference (this file) |
| [USAGE.md](USAGE.md) | Full how-to: scanning, enrichment, tabs, scoring, export columns |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Sales workflow, Companies House setup, troubleshooting |
| [CHANGELOG.md](CHANGELOG.md) | Version history and recent fixes |
| [product-features.txt](product-features.txt) | Complete product & technical feature inventory |

---

## Roadmap

| Item | Status |
|------|--------|
| Local SMB scan (Maps / Places) | ✅ Shipped |
| Companies House (4 endpoints) | ✅ Shipped |
| Openmart `find_people` parser + UI | ✅ Shipped |
| UK waterfall: CH → Openmart → Cognism | ✅ Shipped |
| US waterfall: Openmart → Lusha | ✅ Shipped |
| **Corporate / enterprise mode** | 🔜 Planned |
| Corporate: Google person/company SERP scan | 🔜 Planned |
| Corporate: LinkedIn + website-first capture | 🔜 Planned |
| Corporate: Openmart + Cognism/Lusha (no CH) | 🔜 Planned |
| Isolated corporate build for testing | 🔜 Planned (separate `dist` or copy folder) |

Corporate mode will target person + company profiles (Google Search, LinkedIn, websites) rather than Maps local packs. Planned as an **isolated deployment** so the working SMB build is not affected.

---

## Security notes

- API keys are stored in `chrome.storage.local` and may be pre-filled via `extension/src/config/builtin-keys.ts` for sales builds.
- **Do not commit real API keys** to public repositories — rotate keys if exposed.
- Companies House keys are free but should still be treated as credentials.
- Cognism and Lusha calls consume credits on redeem/enrich.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Extension platform | Chrome Manifest V3 |
| UI | React 18, TypeScript, Tailwind CSS |
| Build | Vite 5, esbuild |
| Export | SheetJS (`xlsx`) |
| Background | Service worker + content scripts |
| APIs | Companies House REST, Openmart, Cognism, Lusha, PDL, Explorium |

**Permissions:** `activeTab`, `scripting`, `downloads`, `sidePanel`, `tabs`, `storage`  
**Hosts:** Google Search/Maps, all HTTPS/HTTP (website enrichment)

---

## License

Private — internal sales tool. Contact the project owner for distribution rights.
