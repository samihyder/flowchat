# FlowChat Marketing Module: Connectivity Sequence & User Flow

This document maps the navigational flow and interaction logic for the Marketing module, linking the 44 user stories and 20 requirements into a cohesive application structure.

## 1. Core Campaign Lifecycle Flow

### Phase A: Discovery & Management
1. **Campaign List (Empty State)** `{{DATA:SCREEN:SCREEN_35}}`: The entry point for new users. 
   - *Action:* Click "Create your first campaign" or "New campaign" → **Wizard Step 1**.
2. **Campaign List (Active)** `{{DATA:SCREEN:SCREEN_9}}`: Managing existing outreach.
   - *Action:* Click "⋮" (Kebab Menu) → **Duplicate/Pause/Cancel Modal** `{{DATA:SCREEN:SCREEN_3}}`.
   - *Action:* Click Campaign Name → **Stats Detail** `{{DATA:SCREEN:SCREEN_20}}`.

### Phase B: The Campaign Wizard (The Happy Path)
1. **Step 1: Recipients** `{{DATA:SCREEN:SCREEN_11}}`: Audience selection.
   - *Action:* Search/Filter CRM contacts or "Import from Segment" `{{DATA:SCREEN:SCREEN_33}}`.
   - *Action:* Click "Next" → **Step 2**.
2. **Step 2: Sequence** `{{DATA:SCREEN:SCREEN_28}}`: Building the outreach.
   - *Action:* Click "Bulk add from templates" → **Bulk Template Modal** `{{DATA:SCREEN:SCREEN_5}}`.
   - *Action:* Click "Open full-screen editor" → **Composer** `{{DATA:SCREEN:SCREEN_7}}` or `{{DATA:SCREEN:SCREEN_12}}`.
   - *Action:* Click "Next" → **Step 3**.
3. **Step 3: Sender & Signature** `{{DATA:SCREEN:SCREEN_27}}`: Branding and verification.
   - *Action:* Verify provider health → **Marketing Health Settings** `{{DATA:SCREEN:SCREEN_6}}`.
   - *Action:* Click "Next" → **Step 4**.
4. **Step 4: Review & Launch** 
   - **Admin View** `{{DATA:SCREEN:SCREEN_36}}`: Final checks and deployment.
     - *Action:* Click "Launch Campaign" → **Launch Confirmation** `{{DATA:SCREEN:SCREEN_18}}`.
   - **Agent View** `{{DATA:SCREEN:SCREEN_15}}`: Restricted access.
     - *Interaction:* Sees admin-required banner; "Launch" hidden.

### Phase C: Post-Launch Analytics
1. **Stats Overview** `{{DATA:SCREEN:SCREEN_20}}`: High-level funnel performance.
2. **Email Steps Tab** `{{DATA:SCREEN:SCREEN_24}}`: Performance per follow-up.
3. **Recipients Tab** `{{DATA:SCREEN:SCREEN_29}}`: Drill-down into contact events.
   - *Action:* Click Contact → **CRM Profile Timeline** `{{DATA:SCREEN:SCREEN_31}}`.
4. **Activity Log** `{{DATA:SCREEN:SCREEN_16}}`: Technical audit trail.

## 2. Infrastructure & Edge Cases
- **Marketing Health** `{{DATA:SCREEN:SCREEN_6}}`: Accessible via Settings or Wizard Step 4.
- **Error States** `{{DATA:SCREEN:SCREEN_32}}`: Triggered by provider disconnects or cron failures.
- **Empty States** `{{DATA:SCREEN:SCREEN_22}}`: Onboarding for the Template Library.

---
*Reference: Epic S6M · FlowChat Marketing Module*