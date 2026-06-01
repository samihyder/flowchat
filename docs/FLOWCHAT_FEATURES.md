# FlowChat 1.0 Product And Feature Document

## Product Summary

FlowChat is a SaaS-based, multi-tenant customer messaging platform for website chat, ecommerce chat, CRM conversations, AI-assisted support, automation, and chatbot-driven customer engagement.

FlowChat 1.0 is designed to operate as a single messaging hub where businesses can manage conversations from their website, ecommerce store, CRM workflows, and social messaging channels in one shared inbox. The application is based on the current Chatwoot codebase, with Chatwoot Hub services disabled locally so the product can operate independently from Chatwoot-owned cloud services.

## Product Purpose

FlowChat helps teams communicate with customers, automate repetitive support and sales work, and use AI to improve response speed and quality. It is intended for SaaS delivery where multiple companies can use the same platform while keeping accounts, users, inboxes, contacts, conversations, automation, reports, and integrations separated per tenant.

## Core Audience

- Ecommerce businesses that need live chat, order support, abandoned cart assistance, and product inquiry handling.
- SaaS and service companies that need CRM-style customer conversations and lifecycle support.
- Support teams that need a shared omnichannel inbox.
- Sales teams that need lead capture, qualification, routing, and follow-up automation.
- Agencies or platform operators that want to offer customer messaging as a managed SaaS product.

## Existing Platform Features

### Multi-Tenant Account Management

- Multiple accounts/tenants on one installation.
- Users and agents scoped to accounts.
- Account-level inboxes, contacts, conversations, labels, teams, and settings.
- Account administrator roles and agent membership.
- Super Admin area for installation-level management.

### Omnichannel Shared Inbox

- Unified conversation inbox for multiple customer channels.
- Conversation assignment to agents.
- Team-based routing and ownership.
- Open, resolved, pending, snoozed, and other conversation states.
- Private notes for internal collaboration.
- Customer-facing replies and internal-only discussion in the same conversation timeline.
- Conversation labels and custom attributes.
- Contact profiles connected to conversation history.

### Website Live Chat

- Embeddable website chat widget.
- Web widget inboxes.
- Contact capture through widget conversations.
- Widget branding configuration.
- Widget conversation continuity.
- File and media attachments where supported.
- Customer satisfaction collection support.

### Contact And CRM Foundations

- Contact records with email, phone, name, identifiers, custom attributes, and conversation history.
- Company records and company association support.
- Contact search and filtering.
- Contact inbox identity mapping across channels.
- Contact import/export style workflows through existing data structures and APIs.

### Automation

- Automation rules for conversation workflows.
- Event-based actions for routing, labeling, assignment, and operational workflows.
- Scheduled jobs for background processing.
- Webhooks for account events and conversation activity.
- API-based custom integrations and dashboard apps.

### Team Operations

- Agent assignment.
- Team inbox membership.
- Availability/status concepts.
- Canned responses/macros for repeat answers.
- Mentions, notes, and collaboration primitives.
- Notifications for conversation events.

### Reporting And Analytics

- Conversation reports.
- Agent/team performance reporting foundations.
- CSAT reporting support.
- Account-level operational metrics.
- Search and data structures for conversation analysis.

### Integrations

- Slack integration for team collaboration.
- Webhooks for external systems.
- API channels for custom messaging sources.
- Dashboard apps for embedding external customer/order/context views.
- Email, website widget, Facebook, WhatsApp, and other supported channel foundations in the existing codebase.

### AI And Assistant Foundations

- AI writing assistance prompts for grammar correction and tone rewriting.
- LLM service/instrumentation foundations.
- Captain/assistant-related enterprise structures.
- AI agent and knowledge-oriented service foundations.
- Configuration points for external AI providers.

### Administration And Security

- User authentication.
- Password reset and email confirmation flows.
- MFA/2FA-related configuration support.
- SSO/SAML foundations in enterprise areas.
- Audit log foundations.
- Role and permission concepts.
- Installation-level settings through Super Admin.

## FlowChat 1.0 Product Direction

### Brand Identity

- Product name: FlowChat.
- Version: 1.0.
- Positioning: all-in-one AI-powered customer messaging, CRM chat, ecommerce chat, automation, and chatbot platform.
- Deployment model: SaaS multi-tenant application.

### Messaging Hub Vision

FlowChat should operate as a single customer messaging hub for:

- Website chat.
- Ecommerce chat.
- CRM chat.
- Facebook page messaging.
- Instagram messaging.
- WhatsApp messaging.
- Twitter/X messaging.
- TikTok messaging.
- Email conversations.
- API/custom channels.

### Ecommerce Chat

Planned ecommerce-oriented capabilities:

- Website and storefront chat widget.
- Product inquiry conversations.
- Order status and fulfillment support through ecommerce integrations.
- Customer profile and purchase context inside conversations.
- Abandoned cart recovery workflows.
- Automated FAQs for shipping, refunds, returns, and product availability.
- AI-assisted product recommendations and reply drafting.

### CRM Chat

Planned CRM-oriented capabilities:

- Customer timeline across all channels.
- Lead capture and qualification.
- Sales pipeline handoff through labels, custom attributes, and automation.
- Account and contact enrichment.
- Follow-up reminders and workflow automation.
- Integration points for external CRM systems.

### AI Functions

Planned AI capabilities:

- AI reply suggestions.
- Grammar and tone rewriting.
- Conversation summarization.
- Intent detection.
- Sentiment analysis.
- Suggested labels and routing.
- Knowledge-base answer generation.
- Agent assist for support and sales teams.
- AI-powered chatbot for first-response automation.

### Automation

Planned automation capabilities:

- Rule-based conversation routing.
- Auto-assignment by team, inbox, channel, language, priority, or customer segment.
- Auto-tagging and SLA workflows.
- Follow-up automation.
- Escalation rules.
- Lead qualification flows.
- Chatbot-to-human handoff.
- Webhook and API-driven automation for external systems.

### Chatbot

Planned chatbot capabilities:

- No-code or low-code chatbot flows.
- FAQ and knowledge-base answers.
- AI chatbot responses backed by configured content.
- Qualification questions for leads.
- Ecommerce support flows for order status, returns, and product help.
- Human handoff when confidence is low or customer requests an agent.

### Social Messaging Hub

Planned social messaging capabilities:

- Connect Facebook pages.
- Connect Instagram business accounts.
- Connect WhatsApp business channels.
- Connect Twitter/X messaging where API access permits.
- Connect TikTok messaging where API access permits.
- Normalize all messages into a single inbox model.
- Preserve customer identity and channel context.
- Allow agents to reply from FlowChat while messages are delivered through the original social channel.

## Current Local Separation From Chatwoot Services

The local FlowChat setup disables Chatwoot-owned Hub calls with:

```env
DISABLE_CHATWOOT_HUB=true
DISABLE_TELEMETRY=true
ENABLE_PUSH_RELAY_SERVER=false
```

This prevents calls to Chatwoot Hub for version sync, telemetry, registration, support widget config, and push relay. Third-party integrations such as social channels, email, web push, OpenAI, Slack, or ecommerce platforms will still call their own providers when configured.

## MVP Scope For FlowChat 1.0

- Product branding as FlowChat 1.0.
- Multi-tenant SaaS foundation.
- Website chat widget.
- Shared inbox.
- Contact and conversation CRM foundation.
- Automation rules.
- Agent/team routing.
- AI writing assistance foundations.
- Webhooks and API integration points.
- Social messaging channel foundations.
- Local independence from Chatwoot Hub services.

## Future Roadmap

- Dedicated ecommerce connectors such as Shopify, WooCommerce, and custom storefront APIs.
- TikTok messaging integration where API support is available.
- Advanced AI chatbot builder.
- CRM pipeline views.
- Billing, subscriptions, plans, and tenant provisioning for SaaS operations.
- White-label branding and custom domains per tenant.
- Usage metering and plan limits.
- Advanced analytics for sales, support, automation, and AI performance.

## Development Timeline Estimate

These estimates assume Codex is used continuously for implementation, refactoring, documentation, test support, and debugging. Calendar time still depends on product decisions, API approvals, provider setup, QA, deployment readiness, and review cycles.

### MVP FlowChat 1.0

Estimated time: 4-8 weeks.

Expected scope:

- Product fork cleanup and user-facing FlowChat branding.
- SaaS tenant foundation.
- Website chat and shared inbox.
- Basic automation.
- Basic AI agent assist.
- One ecommerce or social messaging path hardened enough for early use.

### Full Documented Vision

Estimated time: 4-8 months.

Expected scope:

- Mature SaaS billing and tenant limits.
- Ecommerce integrations.
- CRM improvements.
- Automation builder.
- AI chatbot.
- Reporting improvements.
- Expanded social messaging channels.
- Production hardening.

### Area-Level Estimates

| Area | Estimate |
| --- | --- |
| Product fork cleanup and branding | 2-5 days |
| SaaS plans, billing, and tenant limits | 2-4 weeks |
| Website/shared inbox polish | 1-2 weeks |
| Ecommerce connector, Shopify first | 2-4 weeks |
| CRM/customer timeline improvements | 2-4 weeks |
| Automation builder improvements | 3-6 weeks |
| AI agent assist | 2-4 weeks |
| Chatbot builder | 4-8 weeks |
| Facebook, Instagram, and WhatsApp hardening | 2-5 weeks |
| Twitter/X and TikTok messaging | Uncertain; depends heavily on API access |

### Recommended Build Order

1. Product fork cleanup and branding.
2. SaaS billing, plans, tenant limits, and provisioning.
3. Ecommerce connector, starting with Shopify.
4. CRM contact and customer timeline improvements.
5. Automation builder improvements.
6. AI agent assist.
7. Chatbot builder.
8. Extra social messaging channels.
