# Changelog

## June 2026 — Openmart fix + UK/US waterfall reorder

### Openmart find_people parsing (fix)
- Fixed response parsing: `phones[].phone_number`, `line_type: MOBILE`, `confidence_grade`
- Displays all Openmart contacts in Owner tab (not just first record)
- UK Openmart lookup uses CH registered company name + director name

### Waterfall reorder
- **UK:** Companies House → Openmart → Cognism (was Openmart → CH → Cognism)
- **US:** Openmart → Lusha (unchanged; Lusha only when Openmart has no mobile)

### Owner tab UI
- Lookup path breadcrumb (e.g. `Companies House → Openmart → Cognism`)
- Openmart contacts card with title, mobile, grade, LinkedIn per person
- Primary contact section with mobile source (Openmart / Cognism / Lusha)

---

## June 2026 — Companies House & sales workflow

### Companies House (working)

- Implemented full UK Companies House API integration with four endpoints:
  - Company search, officers, PSC, registered office address
- One API key for all endpoints (Basic auth)
- Built-in API key for sales builds; Settings override supported
- **CH test mode**: register lookup only, skips Openmart/Cognism/Lusha
- **Local SMB mode** (default): UK waterfall Openmart → CH → Cognism
- CH auto-enables all four endpoints when test mode or Local SMB mode is on
- Owner tab auto-fills editable fields: registered company, company no., status, address, director, director role, PSC, primary owner
- Settings Test button validates all four endpoints
- Export adds: Director Role, PSC Name, Registered Company, Registered Office, Company Status
- Fixed API key missing / CH disabled errors (`resolveChSettings`, `mergeEnrichSettings`)

### Scan & enrichment

- Unified Google Search local scanner (`hfpxzc`, `data-cid`, Maps place links)
- Scan captures Places/Maps businesses only (not organic blogs/aggregators)
- Manual Scan / Load more — stable results, no auto-scan on scroll or panel open
- Fixed Openmart `batch_ready` polling
- Fixed Google Search “no business found” on local pack pages

### UI & workflow

- Sales tabs: **Find** → **Results** → **Pipeline**
- Owner sub-tab with CH fields and lookup actions
- Fixed `onOpenSettings is not defined` crash in Scan tab
- Settings: Local SMB API Keys, CH endpoint toggles, CH test mode banner

### Documentation

- Added `docs/WORKFLOW.md`
- Updated `USAGE.md` and `product-features.txt`
