# FlowChat — Marketing Campaign Module · Implementation Checklist
**Version:** 1.1 (Final)
**Status:** Ready for Cursor Development

## 1. Core Lifecycle (S6M-1 to S6M-5)
- [ ] **Campaign ID Creation:** Wizard step 0 saves draft and displays ID mono-chip.
- [ ] **Status Filtering:** Dashboard table supports: draft, scheduled, running, paused, completed, cancelled.
- [ ] **Admin Launch (RBAC):** Only admin role sees and can execute "Launch Campaign".
- [ ] **Pause/Cancel:** Destructive and non-destructive campaign control with impact summary.
- [ ] **Duplication:** Clone campaign metadata and email snapshots without copying recipients.

## 2. Audience & CRM (S6M-6 to S6M-10, S6M-35)
- [ ] **Recipient Picker:** CRM search with multi-select and select-all.
- [ ] **Segment Import:** Optional import from static/dynamic segments into campaign list.
- [ ] **Suppression Rules:** Visual flags and blocks for bounced/unsubscribed contacts.
- [ ] **CRM Isolation:** Verification that outreach ONLY starts from the Marketing module.
- [ ] **Review Step:** Final audience confirmation before deployment.

## 3. Composer & Library (S6M-11 to S6M-15, S6M-20)
- [ ] **Template Library:** Reusable module grid with archive and edit logic.
- [ ] **Full-Screen Composer:** Slide-up overlay with rich text, subject line, and subject field.
- [ ] **Merge Tags:** Indigo-tinted chips for {{first_name}}, {{meeting_link}}, etc.
- [ ] **Save as Template:** In-wizard checkbox to save current email to library.
- [ ] **Email Snapshots:** Persistence of email content at time of launch.
- [ ] **No Attachments:** Strict exclusion of file attachments from marketing mail.

## 4. Sequence & Logistics (S6M-16 to S6M-19, S6M-41)
- [ ] **Multi-Step UI:** Card-based sequence builder with animated connectors.
- [ ] **Scheduling:** Explicit date/time selection per step (stored in UTC).
- [ ] **Validation:** Ensure step N+1 > step N and merge field requirements met.
- [ ] **Source Selection:** Modal to pick contact_message source (latest note/chat).

## 5. Compliance & Infrastructure (S6M-21 to S6M-25, S6M-31 to S6M-34)
- [ ] **Signature Block:** Workspace defaults + per-campaign overrides.
- [ ] **Footer Preview:** Mandatory compliance block with address and unsubscribe.
- [ ] **Test Send:** Mandatory verified test before launch button enables.
- [ ] **Marketing Health:** Provider health, domain verification, and cron status monitoring.
- [ ] **Cron Integration:** Background worker polling for scheduled dispatch.

## 6. Analytics & Feed (S6M-26 to S6M-30, S6M-43)
- [ ] **Metric Funnel:** Dashboard cards for Delivered, Opened, Clicked, Bounced.
- [ ] **Step Drill-Down:** Stats broken down by individual follow-up.
- [ ] **Recipient Activity:** Expandable rows showing per-step delivery timeline.
- [ ] **Timeline Integration:** Marketing events reflected in CRM contact profile.

## 7. Motion & Interaction
- [ ] **Composer Entrance:** 300ms slide-up transition.
- [ ] **Sequence Timeline:** Staggered entrance for cards; animated path connectors.
- [ ] **Autosave:** Subtle pulse indicator on status change.

## 8. Error & Empty States
- [ ] **Provider Error:** Connection failure illustration and "Re-verify" flow.
- [ ] **Empty Library:** "Start from scratch" onboarding empty state.
- [ ] **Validation Banners:** Color-coded alerts for system and user input errors.
