'use client';

import { useState } from 'react';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { useModalFocus } from '@/components/marketing/ui/use-modal-focus';
import { Button } from '@/components/ui/button';

const SUGGESTIONS = [
  {
    id: 'intro',
    label: 'Warm introduction',
    html: `<p>Hi {{first_name}},</p><p>I hope you're having a great week. I wanted to reach out because I think we could help your team streamline outreach and follow-ups.</p><p>Would you be open to a quick chat? You can book time here: {{meeting_link}}</p><p>Best,<br>{{agent_name}}</p>`,
  },
  {
    id: 'followup',
    label: 'Gentle follow-up',
    html: `<p>Hi {{first_name}},</p><p>Just following up on my last note — I'd love to hear whether this is still a priority for you.</p><p>{{contact_message}}</p><p>Happy to share examples from our portfolio: {{portfolio_link}}</p><p>Thanks,<br>{{agent_name}}</p>`,
  },
  {
    id: 'meeting',
    label: 'Meeting request',
    html: `<p>Hi {{first_name}},</p><p>Do you have 15 minutes this week to discuss how we can support your goals? Grab a slot on my calendar: {{meeting_link}}</p><p>Looking forward to connecting,<br>{{agent_name}}<br>{{agent_email}}</p>`,
  },
] as const;

type Props = {
  onApply: (html: string) => void;
};

export function ComposerSmartSuggest({ onApply }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useModalFocus(open, () => setOpen(false));

  return (
    <>
      <div className="mt-8 p-4 bg-primary-surface rounded-xl border border-primary-border shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <MarketingIcon name="auto_awesome" className="text-primary text-sm" />
          <span className="text-xs font-bold text-primary uppercase">Smart Suggest</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Need help writing? Choose a starter draft with merge tags for your campaign goals.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-xs font-bold text-primary hover:underline transition-all"
        >
          Launch Assistant
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
          <div
            ref={panelRef}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="smart-suggest-title"
          >
            <h2 id="smart-suggest-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MarketingIcon name="auto_awesome" className="text-primary" />
              Smart Suggest
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Pick a starter — you can edit everything before saving.
            </p>
            <ul className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-border hover:bg-primary-surface/50 transition-colors"
                    onClick={() => {
                      onApply(s.html);
                      setOpen(false);
                    }}
                  >
                    <span className="text-sm font-medium text-gray-900">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
