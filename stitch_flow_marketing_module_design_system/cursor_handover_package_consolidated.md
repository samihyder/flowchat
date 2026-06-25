# FlowChat Marketing Module Handover for Cursor

## 1. Project Overview
The FlowChat Marketing Module is an enterprise-grade email campaign management system. This handover package contains everything needed for production development, including visual tokens, functional requirements, and screen references.

## 2. Design System Tokens (FlowChat Campaign System)
{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}

## 3. Core Specifications
Refer to the following documents for full logic, behavior, and story acceptance criteria:
- **Design Spec:** {{DATA:DOCUMENT:DOCUMENT_10}}
- **Implementation Checklist:** {{DATA:DOCUMENT:DOCUMENT_17}}
- **Handover Instructions:** {{DATA:DOCUMENT:DOCUMENT_25}}

## 4. High-Fidelity UI Reference Map
Provide these screens to Cursor for structural and visual reference.

### Happy Path: Campaign Lifecycle
- **Campaign List:** {{DATA:SCREEN:SCREEN_7}}
- **Step 1 (Recipients):** {{DATA:SCREEN:SCREEN_8}}
- **Step 2 (Sequence):** {{DATA:SCREEN:SCREEN_21}} (with motion)
- **Step 3 (Sender):** {{DATA:SCREEN:SCREEN_19}}
- **Step 4 (Review/Launch):** {{DATA:SCREEN:SCREEN_26}}
- **Admin Launch Walkthrough:** {{DATA:SCREEN:SCREEN_11}}

### Advanced Interfaces
- **Full-Screen Composer:** {{DATA:SCREEN:SCREEN_9}} (with motion/autosave)
- **Campaign Analytics:** {{DATA:SCREEN:SCREEN_13}}
- **Segments Management:** {{DATA:SCREEN:SCREEN_24}}
- **Contact Profile Timeline:** {{DATA:SCREEN:SCREEN_22}}

### Edge Cases & Settings
- **Empty Library:** {{DATA:SCREEN:SCREEN_15}}
- **Marketing Health Errors:** {{DATA:SCREEN:SCREEN_23}}
- **Modals:** {{DATA:SCREEN:SCREEN_12}} (Launch), {{DATA:SCREEN:SCREEN_2}} (Pause/Cancel)

## 5. Visual Asset Inventory
- **Template Library Illustration:** {{DATA:IMAGE:IMAGE_14}}
- **Provider Error Illustration:** {{DATA:IMAGE:IMAGE_27}}

## 6. Technical Implementation Notes
- **Motion:** Use Framer Motion for composer slide-ups (300ms) and sequence card staggered loads.
- **Rich Text:** Tiptap/Lexical for the composer. **Strictly no file attachments.**
- **RBAC:** Enforce Launch button visibility for `administrator` role only.
- **Data Flow:** Initial draft creation on Step 0 (POST `/api/marketing/campaigns`).
