'use client';

import type { ContactDetail } from '@/lib/api';

type Props = {
  contact: ContactDetail;
  onOpenPanel: () => void;
  onSetType: (type: 'visitor' | 'lead' | 'customer') => void;
  onCreateCampaign: () => void;
  typeBusy?: boolean;
  campaignBusy?: boolean;
};

function Chip({
  onClick,
  href,
  disabled,
  children,
  title,
}: {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  const className =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

  if (href && !disabled) {
    return (
      <a href={href} className={className} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function ContactQuickActionBar({
  contact,
  onOpenPanel,
  onSetType,
  onCreateCampaign,
  typeBusy,
  campaignBusy,
}: Props) {
  const latestConversation = contact.conversations?.[0];

  return (
    <div className="flex flex-wrap gap-2">
      {latestConversation && (
        <Chip href={`/dashboard?conversation=${latestConversation.id}`} title="Open inbox">
          💬 Open chat
        </Chip>
      )}
      {contact.email && (
        <Chip href={`mailto:${contact.email}`} title="Send email">
          ✉️ Email
        </Chip>
      )}
      {contact.phone && (
        <Chip href={`tel:${contact.phone}`} title="Call contact">
          📞 Call
        </Chip>
      )}
      {contact.type !== 'customer' && (
        <Chip onClick={() => onSetType('customer')} disabled={typeBusy} title="Mark as customer">
          ⭐ Mark customer
        </Chip>
      )}
      {contact.type !== 'lead' && (
        <Chip onClick={() => onSetType('lead')} disabled={typeBusy} title="Mark as lead">
          🎯 Mark lead
        </Chip>
      )}
      <Chip
        onClick={onCreateCampaign}
        disabled={campaignBusy || !contact.email}
        title={contact.email ? 'Create campaign' : 'Email required'}
      >
        📧 New campaign
      </Chip>
      <Chip onClick={onOpenPanel} title="All quick actions">
        ⚡ More actions
      </Chip>
    </div>
  );
}
