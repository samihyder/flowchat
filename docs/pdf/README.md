# User guide PDFs

Branded PDF exports for the sales team.

## Files

| PDF | Source |
|-----|--------|
| `FlowChat-Product-Guide.pdf` | `../marketing/FLOWCHAT_PRODUCT_GUIDE.html` (premium marketing guide) |
| `LeadSnapper-User-Guide.pdf` | `../LEADSNAPPER_USER_GUIDE.md` |
| `FlowChat-User-Guide.pdf` | `../FLOWCHAT_USER_GUIDE.md` |
| `LeadSnapper-Quick-Reference.pdf` | `../quick-reference/LEADSNAPPER_QUICK_REFERENCE.md` |
| `FlowChat-Quick-Reference.pdf` | `../quick-reference/FLOWCHAT_QUICK_REFERENCE.md` |

FlowChat guides use the logo from `../logo.svg`. LeadSnapper guides use a styled **LeadSnapper** wordmark in the header.

The **Product Guide** uses Mutex teal branding, enlarged UI screens from `../marketing/screens/`, and the platform USPs for prospect / partner walkthroughs.

## Regenerate

From the repo root:

```bash
pnpm docs:pdf              # user guides + quick refs
pnpm docs:product-guide    # premium marketing product guide
```

Requires `md-to-pdf` and `marked` (dev dependencies). First run may download Chromium for Puppeteer.

## Print tips

- **Product guide** — share with prospects and partners; use screen pages in live demos.
- **Full guides** — share as onboarding PDFs or email attachments.
- **Quick references** — print double-sided A4 for desk cheat sheets.
