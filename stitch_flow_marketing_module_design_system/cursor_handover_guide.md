# FlowChat Marketing Module · Developer Handover Instructions

## 1. Core Architecture
- **Tech Stack:** Next.js (App Router), Tailwind CSS, Lucide React (Icons).
- **Design System:** Use the `FlowChat Campaign System` tokens for all colors, spacing, and typography.
- **State Management:** Prioritize server components for lists; client-side state for the Wizard and Composer.

## 2. Files for Cursor
To develop this module, provide the following artifacts from the Stitch canvas to your Cursor instance:

### A. Specifications
1. **`marketing-module-design.md`**: The primary design spec.
2. **`Marketing Module Checklist`**: The feature-by-feature completion guide.
3. **`design_system.json`**: The technical token values for colors and type.

### B. UI References (Screenshots)
- **Primary Flows:** SCREEN_7 (List), SCREEN_8 (Recipients), SCREEN_19 (Sequence), SCREEN_24 (Review).
- **Advanced UI:** SCREEN_9 (Composer), SCREEN_20 (Motion Sequence).
- **Edge Cases:** SCREEN_15 (Empty), SCREEN_22 (Error).

### C. Implementation Notes
- **Animation:** Use Framer Motion for the slide-up composer (`SCREEN_9`) and sequence staggered loads (`SCREEN_20`).
- **Rich Text:** Implement the composer using Tiptap or Lexical; ensure no attachment support is provided.
- **Responsive:** Reference `SCREEN_16` for the mobile campaign list pattern.

## 3. Data Flow
- **Campaign CRUD:** POST `/api/marketing/campaigns` on Step 0.
- **Cron Dispatch:** Worker polls `/api/cron/marketing` every 60s.
- **Webhooks:** Ingest events from Resend/SendGrid to `/api/webhooks/marketing`.
