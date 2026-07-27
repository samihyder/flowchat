'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type ChannelCampaign, type Contact, type MarketingSegment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { labelClass, selectClass } from '@/components/ui/form-field';

export default function ChannelCampaignsPage() {
  const { token, accountId } = useAuthStore();
  const [campaigns, setCampaigns] = useState<ChannelCampaign[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState('whatsapp');
  const [templateBody, setTemplateBody] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactHits, setContactHits] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const [campRes, segRes] = await Promise.all([
      api.channelCampaigns.list(accountId, token),
      api.marketing.segments.list(accountId, token).catch(() => ({ segments: [] as MarketingSegment[] })),
    ]);
    setCampaigns(campRes.campaigns);
    setSegments(segRes.segments);
  }, [token, accountId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!token || !accountId || contactQuery.trim().length < 2) {
      setContactHits([]);
      return;
    }
    const t = setTimeout(() => {
      api.contacts
        .list(accountId, token, { q: contactQuery.trim(), limit: 8 })
        .then((r) => setContactHits(r.contacts))
        .catch(() => setContactHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [contactQuery, token, accountId]);

  const addContact = (c: Contact) => {
    setSelectedContacts((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
    setContactQuery('');
    setContactHits([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;

    let contactIds = selectedContacts.map((c) => c.id);
    if (segmentId && token) {
      try {
        const preview = await api.marketing.segments.preview(accountId, segmentId, token);
        const fromSeg = preview.preview.map((p) => p.id);
        contactIds = [...new Set([...contactIds, ...fromSeg])];
      } catch {
        /* keep selected contacts only */
      }
    }

    if (contactIds.length === 0) {
      setError('Select at least one contact or a marketing segment with members.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.channelCampaigns.create(
        accountId,
        {
          name: name.trim(),
          channelType,
          templateBody: templateBody.trim() || null,
          segmentId: segmentId || null,
          contactIds,
        },
        token
      );
      setName('');
      setTemplateBody('');
      setSegmentId('');
      setSelectedContacts([]);
      setMessage(`Campaign created with ${contactIds.length} recipient(s).`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async (campaign: ChannelCampaign) => {
    if (!token || !accountId || !confirm(`Launch "${campaign.name}"?`)) return;
    try {
      const res = await api.channelCampaigns.launch(accountId, campaign.id, token);
      setMessage(`Launched — ${res.dispatched ?? res.sent ?? 0} dispatched.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to launch');
    }
  };

  const launchDisabled = (status: string) =>
    status === 'completed' || status === 'running' || status === 'sending';

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      <header className="h-14 bg-white border-b border-gray-200 px-5 flex items-center justify-between gap-4 shrink-0">
        <div>
          <p className="text-base font-semibold text-gray-900">Channel campaigns</p>
          <p className="text-xs text-gray-500">WhatsApp & SMS outreach</p>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        <p className="text-sm text-gray-500">
          Email marketing lives under the Marketing module. Recipients can come from CRM contacts
          (including Lead Monitor / LeadSnapper syncs) or a marketing segment — never auto-enrolled
          into email campaigns.
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Create campaign</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Channel</label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value)}
                  className={selectClass}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Template body</label>
              <Textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={4}
                placeholder="Hi {{name}}, …"
              />
            </div>
            <div>
              <label className={labelClass}>Import from segment (optional)</label>
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className={selectClass}
              >
                <option value="">None</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Add contacts</label>
              <Input
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder="Search contacts by name or email…"
              />
              {contactHits.length > 0 && (
                <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  {contactHits.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => addContact(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                      >
                        {c.name}
                        {c.email ? (
                          <span className="text-gray-400"> · {c.email}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedContacts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedContacts.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-800 px-2 py-1 rounded-full"
                    >
                      {c.name}
                      <button
                        type="button"
                        className="text-primary-600 hover:text-primary-900"
                        onClick={() =>
                          setSelectedContacts((prev) => prev.filter((x) => x.id !== c.id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create campaign'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {campaigns.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No channel campaigns yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <li key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {c.channelType} · {c.status}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={launchDisabled(c.status)}
                    onClick={() => handleLaunch(c)}
                  >
                    Launch
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
