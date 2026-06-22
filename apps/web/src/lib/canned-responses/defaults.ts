export type DefaultCannedResponse = {
  shortcut: string;
  title: string;
  content: string;
  description: string;
};

/** Standard sales & support canned replies — upserted via Settings → Canned responses. */
export const RECOMMENDED_CANNED_RESPONSES: DefaultCannedResponse[] = [
  {
    shortcut: 'hello',
    title: 'Friendly greeting',
    description: 'Open a new chat warmly',
    content:
      'Hi there! Thanks for reaching out to us. How can I help you today?',
  },
  {
    shortcut: 'thanks',
    title: 'Thank you',
    description: 'Acknowledge the visitor',
    content:
      'Thank you for your message — we really appreciate you getting in touch.',
  },
  {
    shortcut: 'services',
    title: 'Our services',
    description: 'Mutex / Nexus service overview',
    content:
      'We offer cybersecurity, software development, AI automation, cloud infrastructure, CRM, live chat, and MFA solutions. Which area are you most interested in?',
  },
  {
    shortcut: 'demo',
    title: 'Book a demo',
    description: 'Offer a discovery call',
    content:
      "Happy to arrange a demo or discovery call. What day and time works best for a 30-minute session?",
  },
  {
    shortcut: 'pricing',
    title: 'Pricing enquiry',
    description: 'Scope-based pricing reply',
    content:
      'Pricing depends on scope and requirements. If you share a brief overview of what you need, we can send a tailored proposal.',
  },
  {
    shortcut: 'callback',
    title: 'Call back promised',
    description: 'When you will phone them',
    content:
      "Thanks for your details. A member of our team will call you back within one business day.",
  },
  {
    shortcut: 'followup',
    title: 'Follow-up check-in',
    description: 'Re-engage after earlier contact',
    content:
      "I'm following up on your earlier enquiry. Do you still need help, or is there anything else we can assist with?",
  },
  {
    shortcut: 'offline',
    title: 'Outside business hours',
    description: 'When team is away',
    content:
      "We're currently outside business hours, but we've received your message. We'll reply as soon as we're back — usually within one business day.",
  },
  {
    shortcut: 'lead',
    title: 'New lead welcome',
    description: 'First touch after LeadSnapper / outbound',
    content:
      "Hi — I noticed your business and thought our services might be a good fit. Would you be open to a quick call this week to explore how we can help?",
  },
  {
    shortcut: 'quote',
    title: 'Send proposal next',
    description: 'Quote / proposal handoff',
    content:
      "I'll prepare a tailored proposal based on what you've shared. You should receive it by email shortly. Let me know if you'd like to walk through it on a call.",
  },
];

export function missingRecommendedCanned(existing: { shortcut: string }[]): DefaultCannedResponse[] {
  const shortcuts = new Set(existing.map((r) => r.shortcut.toLowerCase()));
  return RECOMMENDED_CANNED_RESPONSES.filter((d) => !shortcuts.has(d.shortcut.toLowerCase()));
}
