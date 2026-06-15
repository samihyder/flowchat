'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { api, type ContactDetail, type Conversation, type VisitorContext } from '@/lib/api';
import { countryLabel } from '@/lib/country';
import { Button } from '@/components/ui/button';
import { LabelPill, StatusBadge, PriorityBadge, initials } from '@/components/conversations/conversation-badges';

type Props = {
  accountId: string;
  conversation: Conversation;
  token: string;
  agents: { userId: string; name: string }[];
  onReassign: (assigneeId: string | null) => void;
  saving?: boolean;
};

export function VisitorContextSidebar({
  accountId,
  conversation,
  token,
  agents,
  onReassign,
  saving,
}: Props) {
  const [ctx, setCtx] = useState<VisitorContext | null>(null);
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);

  useEffect(() => {
    api.conversations
      .visitorContext(accountId, conversation.id, token)
      .then((r) => setCtx(r.context))
      .catch(() => setCtx(null));
    api.contacts
      .get(accountId, conversation.contactId, token)
      .then((r) => setContact(r.contact))
      .catch(() => setContact(null));
  }, [accountId, conversation.id, conversation.contactId, token]);

  const participants = conversation.participants ?? [];
  const pastChatCount = ctx?.pastChats.length ?? 0;

  const sectionTitle = 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5';

  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
      {/* Conversation */}
      <section className="p-4 border-b border-gray-200">
        <h3 className={sectionTitle}>Conversation</h3>
        <dl className="space-y-2 text-xs">
          <Row label="Assigned to">
            <span className="inline-flex items-center gap-1.5 font-medium">
              {conversation.assigneeName ? (
                <>
                  <span className="w-[18px] h-[18px] rounded-full bg-primary-500 text-white flex items-center justify-center text-[9px] font-semibold">
                    {initials(conversation.assigneeName)}
                  </span>
                  {conversation.assigneeName}
                </>
              ) : (
                'Unassigned'
              )}
            </span>
          </Row>
          <Row label="Priority">
            {conversation.priority && conversation.priority !== 'medium' ? (
              <PriorityBadge priority={conversation.priority} />
            ) : (
              <span className="text-gray-700">Medium</span>
            )}
          </Row>
          <Row label="Status">
            <StatusBadge status={conversation.status} />
          </Row>
          <Row label="Inbox" value={conversation.inboxName} />
          <Row
            label="CSAT"
            value={conversation.status === 'resolved' ? 'Collected on resolve' : 'Pending resolve'}
          />
        </dl>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full mt-3 justify-center"
          disabled={saving}
          onClick={() => setReassignOpen((o) => !o)}
        >
          Reassign conversation
        </Button>
        {reassignOpen && (
          <select
            className="w-full mt-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
            value={conversation.assigneeId ?? ''}
            disabled={saving}
            onChange={(e) => {
              onReassign(e.target.value || null);
              setReassignOpen(false);
            }}
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.userId} value={a.userId}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Visitor context */}
      <section className="p-4 border-b border-gray-200">
        <h3 className={sectionTitle}>Visitor context</h3>
        {!ctx ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : (
          <dl className="space-y-2 text-xs">
            {ctx.pageUrl && (
              <Row label="🌐 Current page">
                <a
                  href={ctx.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 truncate max-w-[130px] inline-block"
                >
                  {ctx.pageUrl.replace(/^https?:\/\/[^/]+/, '') || ctx.pageUrl}
                </a>
              </Row>
            )}
            {ctx.referrer && <Row label="🔗 Referrer" value={ctx.referrer} />}
            {(ctx.country || ctx.countryCode) && (
              <Row
                label="🌍 Country"
                value={ctx.country ?? countryLabel(ctx.countryCode) ?? ctx.countryCode ?? '—'}
              />
            )}
            <Row label="💻 Browser" value={`${ctx.browser} / ${ctx.device}`} />
            <Row label="👁 Visits" value={`${ctx.visitCount} visit${ctx.visitCount === 1 ? '' : 's'}`} />
            <Row
              label="💬 Past chats"
              value={`${Math.max(0, pastChatCount - 1)} previous`}
            />
          </dl>
        )}
      </section>

      {/* Contact */}
      <section className="p-4 border-b border-gray-200">
        <h3 className={sectionTitle}>Contact</h3>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
            {initials(conversation.contactName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{conversation.contactName}</p>
            <p className="text-[11px] text-gray-500 truncate">
              {conversation.contactEmail ?? contact?.email ?? '—'}
            </p>
          </div>
        </div>
        {contact && (
          <dl className="space-y-2 text-xs mb-3">
            <Row label="Type">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-800 capitalize">
                {contact.type}
              </span>
            </Row>
            {contact.phone && <Row label="Phone" value={contact.phone} />}
            {contact.labels.length > 0 && (
              <Row label="Labels">
                <div className="flex flex-wrap gap-1 justify-end">
                  {contact.labels.map((l) => (
                    <LabelPill key={l.id} name={l.name} color={l.color} />
                  ))}
                </div>
              </Row>
            )}
          </dl>
        )}
        <Link
          href={`/dashboard/contacts/${conversation.contactId}` as Route}
          className="text-xs text-primary-600 hover:underline"
        >
          → View full contact profile
        </Link>
      </section>

      {/* Participants */}
      <section className="p-4">
        <h3 className={sectionTitle}>Participants</h3>
        <div className="flex items-center gap-1.5 mb-2">
          {conversation.assigneeName && (
            <div
              className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-semibold"
              title={conversation.assigneeName}
            >
              {initials(conversation.assigneeName)}
            </div>
          )}
          {participants.map((p) => (
            <div
              key={p.userId}
              className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-semibold"
              title={p.name}
            >
              {initials(p.name)}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          {conversation.assigneeName && `${conversation.assigneeName} (assigned)`}
          {participants.length > 0 &&
            `${conversation.assigneeName ? ' · ' : ''}${participants.map((p) => `${p.name} (observer)`).join(' · ')}`}
          {!conversation.assigneeName && participants.length === 0 && 'No participants yet'}
        </p>
      </section>
    </aside>
  );
}

function Row({
  label,
  value,
  children,
  className = '',
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex justify-between gap-2 items-start">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-gray-800 font-medium text-right ${className}`}>
        {children ?? value ?? '—'}
      </dd>
    </div>
  );
}
