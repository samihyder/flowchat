'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  api,
  type Contact,
  type ContactDetail,
  type DasCatalogItem,
  type DasDocument,
  type DasDocumentSecurity,
  type DasTemplate,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fieldClass } from '@/components/ui/form-field';
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from '@/components/documents/document-badges';
import { DocumentHtmlPreview } from '@/components/documents/document-html-preview';
import {
  formatDocumentStatus,
  formatDocumentType,
  formatWorkflowAction,
  nextDocumentStatuses,
} from '@/lib/das/labels';
import type { DasDocumentStatus } from '@/lib/das/types';
import { formatRelativeTime, initialsFromName } from '@/lib/format';

type LineItem = {
  name: string;
  qty: number;
  unitPrice: number;
  currency: string;
};

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

const actionChip =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-primary-200 hover:bg-primary-50/40 transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';

function parseLineItems(data: Record<string, unknown>): LineItem[] {
  const raw = data.lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      name: String(row.name ?? ''),
      qty: Number(row.quantity ?? row.qty) || 0,
      unitPrice: Number(row.unitPrice) || 0,
      currency: String(row.currency ?? 'USD'),
    };
  });
}

export default function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { token, accountId } = useAuthStore();
  const [document, setDocument] = useState<DasDocument | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [contactQ, setContactQ] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [templates, setTemplates] = useState<DasTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [security, setSecurity] = useState<DasDocumentSecurity | null>(null);
  const [linkedContact, setLinkedContact] = useState<ContactDetail | null>(null);
  const [shareMsg, setShareMsg] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<
    { kind: 'product' | 'service'; item: DasCatalogItem }[]
  >([]);
  const [catalogSelected, setCatalogSelected] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !accountId || !documentId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.documents.get(accountId, documentId, token);
      setDocument(res.document);
      setTitle(res.document.title);
      setContactId(res.document.contactId ?? '');
      setTemplateId(res.document.templateId ?? '');
      setLineItems(parseLineItems(res.document.structuredData));
      setSecurity(res.security ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [token, accountId, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !accountId || !document) return;
    api.das.templates
      .list(accountId, token, { type: document.type, active: true })
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, [token, accountId, document?.type, document]);

  useEffect(() => {
    if (!token || !accountId || !document?.contactId) {
      setLinkedContact(null);
      return;
    }
    api.contacts
      .get(accountId, document.contactId, token)
      .then((r) =>
        setLinkedContact({
          ...r.contact,
          labels: r.labels,
          conversations: r.conversations,
          notes: r.notes,
        } as ContactDetail)
      )
      .catch(() => setLinkedContact(null));
  }, [token, accountId, document?.contactId]);

  useEffect(() => {
    if (!shareMsg) return;
    const handle = window.setTimeout(() => setShareMsg(''), 2800);
    return () => window.clearTimeout(handle);
  }, [shareMsg]);

  useEffect(() => {
    if (!saveMsg) return;
    const handle = window.setTimeout(() => setSaveMsg(''), 2200);
    return () => window.clearTimeout(handle);
  }, [saveMsg]);

  useEffect(() => {
    if (!token || !accountId) return;
    const handle = window.setTimeout(() => {
      api.contacts
        .list(accountId, token, { q: contactQ.trim() || undefined, limit: 8 })
        .then((r) => setContacts(r.contacts))
        .catch(() => setContacts([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [token, accountId, contactQ]);

  const structuredDirty = useMemo(() => {
    if (!document) return false;
    const current = parseLineItems(document.structuredData);
    return JSON.stringify(current) !== JSON.stringify(lineItems);
  }, [document, lineItems]);

  const templateDirty = useMemo(() => {
    if (!document) return false;
    return (templateId || null) !== (document.templateId || null);
  }, [document, templateId]);

  const handleSaveTitle = async () => {
    if (!token || !accountId || !documentId || !title.trim()) return;
    setSaving(true);
    setSaveMsg('');
    setError('');
    try {
      const res = await api.das.documents.update(
        accountId,
        documentId,
        { title: title.trim() },
        token
      );
      setDocument(res.document);
      setTitle(res.document.title);
      setEditingTitle(false);
      setSaveMsg('Title saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save title');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: DasDocumentStatus) => {
    if (!token || !accountId || !documentId) return;
    if (status === 'finalized') {
      await handleFinalize();
      return;
    }
    setStatusBusy(true);
    setError('');
    setSaveMsg('');
    try {
      const res = await api.das.documents.update(
        accountId,
        documentId,
        { status },
        token
      );
      setDocument(res.document);
      setSaveMsg(`Moved to ${formatDocumentStatus(status)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleLinkContact = async () => {
    if (!token || !accountId || !documentId) return;
    setContactBusy(true);
    setError('');
    setSaveMsg('');
    try {
      const res = await api.das.documents.update(
        accountId,
        documentId,
        { contactId: contactId || null },
        token
      );
      setDocument(res.document);
      setContactId(res.document.contactId ?? '');
      setSaveMsg(res.document.contactId ? 'Contact linked' : 'Contact unlinked');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact');
    } finally {
      setContactBusy(false);
    }
  };

  const handleSaveStructured = async () => {
    if (!token || !accountId || !documentId || !document) return;
    setSaving(true);
    setError('');
    setSaveMsg('');
    try {
      const structuredData = {
        ...document.structuredData,
        lineItems: lineItems.map((li) => ({
          name: li.name.trim(),
          quantity: Number(li.qty) || 0,
          unitPrice: Number(li.unitPrice) || 0,
          currency: (li.currency || 'USD').toUpperCase(),
        })),
      };
      const body: {
        structuredData: Record<string, unknown>;
        templateId?: string | null;
      } = { structuredData };
      if (templateDirty) body.templateId = templateId || null;

      const res = await api.das.documents.update(accountId, documentId, body, token);
      setDocument(res.document);
      setTemplateId(res.document.templateId ?? '');
      setLineItems(parseLineItems(res.document.structuredData));
      setSaveMsg('Document data saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!token || !accountId || !documentId) return;
    setSaving(true);
    setError('');
    setSaveMsg('');
    try {
      const res = await api.das.documents.update(
        accountId,
        documentId,
        { templateId: templateId || null },
        token
      );
      setDocument(res.document);
      setTemplateId(res.document.templateId ?? '');
      setSaveMsg(res.document.templateId ? 'Template assigned' : 'Template cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign template');
    } finally {
      setSaving(false);
    }
  };

  const handleRender = async () => {
    if (!token || !accountId || !documentId) return;
    setActionBusy(true);
    setError('');
    setSaveMsg('');
    try {
      const res = await api.das.documents.render(accountId, documentId, token);
      setDocument(res.document);
      setSaveMsg('Preview rendered');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render');
    } finally {
      setActionBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!token || !accountId || !documentId) return;
    setActionBusy(true);
    setStatusBusy(true);
    setError('');
    setSaveMsg('');
    try {
      const res = await api.das.documents.finalize(accountId, documentId, token);
      setDocument(res.document);
      setSecurity(res.security);
      setSaveMsg('Document finalized');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize');
    } finally {
      setActionBusy(false);
      setStatusBusy(false);
    }
  };

  const handlePdf = async () => {
    if (!token || !accountId || !documentId) return;
    setActionBusy(true);
    setError('');
    setSaveMsg('');
    try {
      const res = await api.das.documents.pdf(accountId, documentId, token);
      setSaveMsg('Artifact ready');
      window.open(res.pdfUrl || res.publicUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get PDF/artifact');
    } finally {
      setActionBusy(false);
    }
  };

  const copyVerifyLink = async () => {
    if (!security?.verifyUrl) return;
    try {
      await navigator.clipboard.writeText(security.verifyUrl);
      setShareMsg('Verify link copied');
    } catch {
      setShareMsg('Could not copy link');
    }
  };

  const phoneDigits = (linkedContact?.phone ?? '').replace(/\D/g, '');

  const handleSendInChat = async () => {
    if (!token || !accountId || !document || !security?.verifyUrl) return;
    const conversationId = linkedContact?.conversations?.[0]?.id;
    if (!conversationId) return;
    setChatBusy(true);
    setShareMsg('');
    try {
      await api.conversations.sendMessage(
        accountId,
        conversationId,
        {
          content: `Document ready: ${document.title}\n${security.verifyUrl}`,
        },
        token
      );
      setShareMsg('Sent in chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send in chat');
    } finally {
      setChatBusy(false);
    }
  };

  const openCatalogPanel = async () => {
    if (!token || !accountId) return;
    setCatalogOpen(true);
    setCatalogLoading(true);
    setCatalogSelected(new Set());
    try {
      const [productsRes, servicesRes] = await Promise.all([
        api.das.products.list(accountId, token),
        api.das.services.list(accountId, token),
      ]);
      setCatalogItems([
        ...productsRes.products.map((item) => ({ kind: 'product' as const, item })),
        ...servicesRes.services.map((item) => ({ kind: 'service' as const, item })),
      ]);
    } catch {
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const addSelectedFromCatalog = () => {
    const selected = catalogItems.filter(
      ({ kind, item }) => catalogSelected.has(`${kind}:${item.id}`)
    );
    if (selected.length === 0) return;
    setLineItems((prev) => [
      ...prev,
      ...selected.map(({ item }) => ({
        name: item.name,
        qty: 1,
        unitPrice: Number(item.unitPrice) || 0,
        currency: (item.currency || 'USD').toUpperCase(),
      })),
    ]);
    setCatalogOpen(false);
    setSaveMsg(`Added ${selected.length} item${selected.length === 1 ? '' : 's'} from catalog`);
  };

  const updateLineItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col animate-fade-in">
        <div className="p-8 text-sm text-gray-400">Loading document…</div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="flex h-full min-h-0 flex-col animate-fade-in">
        <div className="px-6 py-5 border-b border-gray-200">
          <Link
            href={'/dashboard/documents' as Route}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            ← All documents
          </Link>
        </div>
        <div className="mx-6 mt-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  if (!document) return null;

  const nextStatuses = nextDocumentStatuses(document.status, {
    wasFinalized: Boolean(document.finalizedAt),
  });
  const titleDirty = title.trim() !== document.title && title.trim().length > 0;
  const canFinalize = document.status === 'approved' || document.status === 'finalized';
  const canPdf =
    document.status === 'finalized' ||
    (document.status === 'approved' && Boolean(document.htmlSnapshot));
  const verifyHref = security?.verifyUrl;

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
      <header className="shrink-0 bg-gradient-to-r from-primary-50 via-cyan-50 to-white border-b border-primary-200/70 px-6 py-5">
        <Link
          href={'/dashboard/documents' as Route}
          className="text-xs font-medium text-primary-700 hover:underline"
        >
          ← All documents
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-700 text-white flex items-center justify-center text-lg font-bold shadow-md shrink-0 ring-2 ring-primary-200/80">
              {initialsFromName(document.title)}
            </div>
            <div className="min-w-0">
              {editingTitle ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setSaveMsg('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveTitle();
                      if (e.key === 'Escape') {
                        setTitle(document.title);
                        setEditingTitle(false);
                      }
                    }}
                    className="text-base font-semibold max-w-md"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving || !titleDirty}
                    onClick={() => void handleSaveTitle()}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setTitle(document.title);
                      setEditingTitle(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <h1 className="text-xl font-bold text-gray-900 truncate">{document.title}</h1>
              )}
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {formatDocumentType(document.type)}
                {document.contactName ? ` · ${document.contactName}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <DocumentTypeBadge type={document.type} />
                <DocumentStatusBadge status={document.status} />
                <span className="text-xs text-gray-400">
                  Updated {formatRelativeTime(document.updatedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
            {!editingTitle && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingTitle(true)}
              >
                Edit title
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={actionBusy}
              onClick={() => void handleRender()}
            >
              Render preview
            </Button>
            {document.status === 'approved' && (
              <Button
                type="button"
                size="sm"
                disabled={actionBusy}
                onClick={() => void handleFinalize()}
              >
                Finalize
              </Button>
            )}
            {canPdf && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={actionBusy}
                onClick={() => void handlePdf()}
              >
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="shrink-0 flex items-stretch bg-white/90 border-b border-primary-100 overflow-x-auto">
        <Fact label="Type" value={<DocumentTypeBadge type={document.type} />} />
        <Fact label="Status" value={<DocumentStatusBadge status={document.status} />} />
        <Fact
          label="Contact"
          value={
            document.contactId && document.contactName ? (
              <Link
                href={`/dashboard/contacts/${document.contactId}` as Route}
                className="text-primary-700 hover:underline font-semibold"
              >
                {document.contactName}
              </Link>
            ) : (
              <span className="text-gray-400 font-normal">Unlinked</span>
            )
          }
        />
        {linkedContact?.conversations?.[0] ? (
          <Fact
            label="Inbox"
            value={
              <Link
                href={`/dashboard?conversation=${linkedContact.conversations[0].id}` as Route}
                className="text-primary-700 hover:underline font-semibold"
              >
                Open chat
              </Link>
            }
          />
        ) : null}
        <Fact
          label="Created"
          value={
            <span className="font-normal text-gray-700">
              {new Date(document.createdAt).toLocaleDateString()}
            </span>
          }
        />
        {document.finalizedAt && (
          <Fact
            label="Finalized"
            value={
              <span className="font-normal text-gray-700">
                {new Date(document.finalizedAt).toLocaleDateString()}
              </span>
            }
          />
        )}
      </div>

      {nextStatuses.length > 0 && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-100 bg-slate-50/60">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 mr-1">
            Workflow
          </span>
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              disabled={statusBusy || actionBusy}
              onClick={() => void handleStatusChange(status)}
              className={actionChip}
            >
              {formatWorkflowAction(status)}
            </button>
          ))}
        </div>
      )}

      {(error || saveMsg) && (
        <div
          className={`mx-6 mt-3 text-sm rounded-lg px-4 py-3 border shrink-0 ${
            error
              ? 'text-red-800 bg-red-50 border-red-200'
              : 'text-primary-900 bg-primary-50 border-primary-200'
          }`}
        >
          {error || saveMsg}
        </div>
      )}

      {verifyHref && (
        <div className="mx-6 mt-3 text-sm rounded-lg px-4 py-3 border border-primary-200 bg-primary-50 text-primary-900 shrink-0">
          Verification link:{' '}
          <a
            href={verifyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline break-all"
          >
            {verifyHref}
          </a>
        </div>
      )}

      {verifyHref && (
        <section className="mx-6 mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm shrink-0">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Share
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={actionChip} onClick={() => void copyVerifyLink()}>
              Copy verify link
            </button>
            {linkedContact?.email && (
              <a
                className={actionChip}
                href={`mailto:${encodeURIComponent(linkedContact.email)}?subject=${encodeURIComponent(
                  `Document ready: ${document.title}`
                )}&body=${encodeURIComponent(
                  `Your document "${document.title}" is ready.\n\nVerify: ${verifyHref}${
                    security?.artifactUrl ? `\nPDF: ${security.artifactUrl}` : ''
                  }`
                )}`}
              >
                Email contact
              </a>
            )}
            {phoneDigits && (
              <a
                className={actionChip}
                href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                  `${document.title}\n${verifyHref}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            )}
            {linkedContact?.conversations?.[0] && (
              <button
                type="button"
                className={actionChip}
                disabled={chatBusy}
                onClick={() => void handleSendInChat()}
              >
                {chatBusy ? 'Sending…' : 'Send in chat'}
              </button>
            )}
          </div>
          {(shareMsg || linkedContact?.conversations?.[0]) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {shareMsg && <span className="text-primary-700">{shareMsg}</span>}
              {linkedContact?.conversations?.[0] && shareMsg === 'Sent in chat' && (
                <Link
                  href={`/dashboard?conversation=${linkedContact.conversations[0].id}` as Route}
                  className="text-primary-600 hover:underline"
                >
                  Open chat →
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 max-w-4xl space-y-6">
          <section>
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Preview
            </h2>
            {document.htmlSnapshot ? (
              <DocumentHtmlPreview html={document.htmlSnapshot} className="max-h-[480px]" />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-700">No rendered snapshot yet</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Assign a template, save line items, then click Render preview.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Line items
                </h2>
                <p className="text-xs text-gray-500">
                  Stored in structured data as {'{{#each lineItems}}'}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void openCatalogPanel()}
                >
                  Add from catalog
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setLineItems((prev) => [
                      ...prev,
                      { name: '', qty: 1, unitPrice: 0, currency: 'USD' },
                    ])
                  }
                >
                  + Add row
                </Button>
              </div>
            </div>

            {catalogOpen && (
              <div className="rounded-lg border border-gray-200 bg-slate-50/80 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">Catalog items</p>
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => setCatalogOpen(false)}
                  >
                    Close
                  </button>
                </div>
                {catalogLoading ? (
                  <p className="text-sm text-gray-400">Loading catalog…</p>
                ) : catalogItems.length === 0 ? (
                  <p className="text-sm text-gray-400">No products or services in catalog.</p>
                ) : (
                  <ul className="max-h-48 overflow-y-auto space-y-1.5">
                    {catalogItems.map(({ kind, item }) => {
                      const key = `${kind}:${item.id}`;
                      const checked = catalogSelected.has(key);
                      return (
                        <li key={key}>
                          <label className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-2 text-sm cursor-pointer hover:border-primary-200">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setCatalogSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  return next;
                                });
                              }}
                            />
                            <span className="flex-1 min-w-0 truncate">{item.name}</span>
                            <span className="text-[10px] uppercase text-gray-400 shrink-0">
                              {kind}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {item.unitPrice} {item.currency}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={catalogSelected.size === 0}
                    onClick={addSelectedFromCatalog}
                  >
                    Add selected ({catalogSelected.size})
                  </Button>
                </div>
              </div>
            )}

            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400">No line items yet.</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-2 sm:grid-cols-12 items-center"
                  >
                    <div className="sm:col-span-5">
                      <Input
                        value={row.name}
                        onChange={(e) =>
                          updateLineItem(index, { name: e.target.value })
                        }
                        placeholder="Item name"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={row.qty}
                        onChange={(e) =>
                          updateLineItem(index, { qty: Number(e.target.value) })
                        }
                        placeholder="Qty"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateLineItem(index, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                        placeholder="Price"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        value={row.currency}
                        onChange={(e) =>
                          updateLineItem(index, { currency: e.target.value })
                        }
                        placeholder="USD"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setLineItems((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={saving || (!structuredDirty && !templateDirty)}
                onClick={() => void handleSaveStructured()}
              >
                {saving ? 'Saving…' : 'Save structured data'}
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Template
              </h2>
              <p className="text-xs text-gray-500">
                Active templates matching this document type.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 min-w-0">
                <select
                  className={fieldClass}
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">No template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (v{t.version})
                    </option>
                  ))}
                  {document.templateId &&
                    !templates.some((t) => t.id === document.templateId) && (
                      <option value={document.templateId}>
                        Current template (inactive or other type)
                      </option>
                    )}
                </select>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !templateDirty}
                onClick={() => void handleAssignTemplate()}
              >
                Assign template
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Linked contact
              </h2>
              <p className="text-xs text-gray-500">
                Associate this document with a Flow CRM contact.
              </p>
            </div>

            {document.contactId && document.contactName && (
              <div className="rounded-lg border border-primary-100 bg-primary-50/40 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {document.contactName}
                  </p>
                  <Link
                    href={`/dashboard/contacts/${document.contactId}` as Route}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Open contact →
                  </Link>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  value={contactQ}
                  onChange={(e) => setContactQ(e.target.value)}
                  placeholder="Search contacts…"
                />
                <select
                  className={fieldClass}
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                >
                  <option value="">No contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` · ${c.email}` : ''}
                    </option>
                  ))}
                  {document.contactId &&
                    document.contactName &&
                    !contacts.some((c) => c.id === document.contactId) && (
                      <option value={document.contactId}>{document.contactName}</option>
                    )}
                </select>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  contactBusy || (contactId || null) === (document.contactId || null)
                }
                onClick={() => void handleLinkContact()}
              >
                {contactBusy ? 'Updating…' : 'Update contact'}
              </Button>
            </div>
          </section>

          {canFinalize && document.status === 'approved' && (
            <section className="rounded-xl border border-primary-100 bg-primary-50/30 p-5 shadow-sm">
              <h2 className="text-[11px] font-semibold text-primary-700 uppercase tracking-wide mb-1">
                Ready to finalize
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                Finalizing locks the HTML snapshot, creates a verification hash, and issues a public verify link.
              </p>
              <Button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleFinalize()}
              >
                {actionBusy ? 'Working…' : 'Finalize document'}
              </Button>
            </section>
          )}

          <p className="text-[11px] text-gray-400 font-mono break-all">ID {document.id}</p>
        </div>
      </div>
    </div>
  );
}
