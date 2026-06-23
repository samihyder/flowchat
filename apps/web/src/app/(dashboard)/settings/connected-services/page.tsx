'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type ServiceCredential } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const EMAIL_PROVIDERS = [
  { id: 'resend', label: 'Resend' },
  { id: 'sendgrid', label: 'SendGrid' },
  { id: 'mailgun', label: 'Mailgun' },
] as const;

const AI_PROVIDERS = [{ id: 'anthropic', label: 'Anthropic (Claude)' }] as const;

const ENRICHMENT_PROVIDERS = [
  { id: 'companies_house', label: 'Companies House (UK)' },
  { id: 'people_data_labs', label: 'People Data Labs' },
  { id: 'lusha', label: 'Lusha' },
  { id: 'cognism', label: 'Cognism' },
  { id: 'openmart', label: 'OpenMart' },
  { id: 'explorium', label: 'Explorium' },
] as const;

export default function ConnectedServicesPage() {
  const { token, accountId } = useAuthStore();
  const [credentials, setCredentials] = useState<ServiceCredential[]>([]);
  const [byokOnly, setByokOnly] = useState(false);
  const [widgetAiEnabled, setWidgetAiEnabled] = useState(false);
  const [aiCredentialId, setAiCredentialId] = useState('');
  const [aiModel, setAiModel] = useState('claude-3-5-haiku-20241022');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error' | ''>('');
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<'email_marketing' | 'ai_chat' | 'data_enrichment'>('email_marketing');
  const [provider, setProvider] = useState('resend');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [mailgunDomain, setMailgunDomain] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [enrichmentBaseUrl, setEnrichmentBaseUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSecret, setEditSecret] = useState('');
  const [editWebhookSecret, setEditWebhookSecret] = useState('');
  const [editMailgunDomain, setEditMailgunDomain] = useState('');

  const load = () => {
    if (!token || !accountId) return;
    api.serviceCredentials.list(accountId, token).then((r) => setCredentials(r.credentials));
    api.account.get(accountId, token).then((r) => {
      setByokOnly(Boolean(r.account.settings?.marketingByokOnly));
      setWidgetAiEnabled(Boolean(r.account.settings?.widgetAiEnabled));
      setAiCredentialId(r.account.settings?.aiCredentialId ?? '');
      setAiModel(r.account.settings?.aiModel ?? 'claude-3-5-haiku-20241022');
    });
  };

  useEffect(load, [token, accountId]);

  const emailCreds = credentials.filter((c) => c.category === 'email_marketing');
  const aiCreds = credentials.filter((c) => c.category === 'ai_chat');
  const enrichmentCreds = credentials.filter((c) => c.category === 'data_enrichment');

  const showMessage = (text: string, kind: 'success' | 'error') => {
    setMessage(text);
    setMessageKind(kind);
  };

  const addCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setBusy(true);
    setMessage('');
    setMessageKind('');
    try {
      const config: Record<string, unknown> = {};
      if (provider === 'mailgun' && mailgunDomain.trim()) {
        config.domain = mailgunDomain.trim();
      }
      if (category === 'email_marketing' && webhookSecret.trim()) {
        config.webhookSigningSecret = webhookSecret.trim();
      }
      if (category === 'ai_chat') {
        config.model = aiModel;
      }
      if (category === 'data_enrichment' && enrichmentBaseUrl.trim()) {
        config.baseUrl = enrichmentBaseUrl.trim();
      }
      await api.serviceCredentials.create(
        accountId,
        {
          category,
          provider,
          label: label.trim(),
          secret: secret.trim(),
          config,
          isDefault:
            (category === 'email_marketing' && emailCreds.length === 0) ||
            (category === 'ai_chat' && aiCreds.length === 0) ||
            (category === 'data_enrichment' && enrichmentCreds.length === 0),
        },
        token
      );
      setLabel('');
      setSecret('');
      setMailgunDomain('');
      setWebhookSecret('');
      setEnrichmentBaseUrl('');
      showMessage('Connection added and verified.', 'success');
      load();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Failed to add connection', 'error');
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async (id: string) => {
    if (!token || !accountId) return;
    setMessage('');
    setMessageKind('');
    try {
      await api.serviceCredentials.test(accountId, id, token);
      showMessage('Connection test passed.', 'success');
      load();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Test failed', 'error');
      load();
    }
  };

  const setDefault = async (id: string) => {
    if (!token || !accountId) return;
    await api.serviceCredentials.update(accountId, id, { isDefault: true }, token);
    load();
  };

  const remove = async (id: string) => {
    if (!token || !accountId || !confirm('Remove this connection?')) return;
    await api.serviceCredentials.remove(accountId, id, token);
    if (editingId === id) setEditingId(null);
    load();
  };

  const startEdit = (c: ServiceCredential) => {
    setEditingId(c.id);
    setEditLabel(c.label);
    setEditSecret('');
    setEditWebhookSecret(
      typeof c.config?.webhookSigningSecret === 'string' ? c.config.webhookSigningSecret : ''
    );
    setEditMailgunDomain(typeof c.config?.domain === 'string' ? c.config.domain : '');
    setMessage('');
    setMessageKind('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !editingId) return;
    const cred = credentials.find((c) => c.id === editingId);
    if (!cred) return;
    setBusy(true);
    setMessage('');
    setMessageKind('');
    try {
      const config: Record<string, unknown> = { ...cred.config };
      if (cred.provider === 'mailgun' && editMailgunDomain.trim()) {
        config.domain = editMailgunDomain.trim();
      }
      if (cred.category === 'email_marketing') {
        config.webhookSigningSecret = editWebhookSecret.trim();
      }
      await api.serviceCredentials.update(
        accountId,
        editingId,
        {
          label: editLabel.trim(),
          config,
          ...(editSecret.trim() ? { secret: editSecret.trim() } : {}),
        },
        token
      );
      setEditingId(null);
      showMessage('Connection updated and saved.', 'success');
      load();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Failed to update connection', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveAiSettings = async (enabled: boolean) => {
    if (!token || !accountId) return;
    setWidgetAiEnabled(enabled);
    setBusy(true);
    try {
      await api.account.update(accountId, { settings: { widgetAiEnabled: enabled } }, token);
      showMessage(enabled ? 'AI enabled for chat widget.' : 'AI disabled for chat widget.', 'success');
    } catch (err) {
      setWidgetAiEnabled(!enabled);
      showMessage(err instanceof Error ? err.message : 'Failed to save AI setting', 'error');
    } finally {
      setBusy(false);
    }
  };

  const savePolicy = async () => {
    if (!token || !accountId) return;
    setBusy(true);
    await api.account.update(
      accountId,
      {
        settings: {
          marketingByokOnly: byokOnly,
          aiCredentialId: aiCredentialId || undefined,
          aiModel,
        },
      },
      token
    );
    setBusy(false);
    showMessage('Workspace policy saved.', 'success');
  };

  const testAi = async () => {
    if (!token || !accountId) return;
    setMessage('');
    setMessageKind('');
    try {
      const r = await api.ai.chat(
        accountId,
        { messages: [{ role: 'user', content: 'Reply with exactly: OK' }], credentialId: aiCredentialId || undefined },
        token
      );
      showMessage(`AI test: ${r.text.slice(0, 120)}`, 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'AI test failed', 'error');
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Connected services</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bring your own API keys for email marketing, AI, and CRM data enrichment. Keys are encrypted and stored
          permanently — edit anytime to rotate a key.
        </p>
      </div>

      {editingId && (
        <form onSubmit={saveEdit} className="bg-white border border-primary-200 rounded-xl p-5 space-y-3">
          <h3 className="font-medium text-gray-900">Edit connection</h3>
          <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" required />
          <Input
            type="password"
            value={editSecret}
            onChange={(e) => setEditSecret(e.target.value)}
            placeholder="New API key (leave blank to keep current)"
            autoComplete="off"
          />
          {credentials.find((c) => c.id === editingId)?.provider === 'mailgun' && (
            <Input
              value={editMailgunDomain}
              onChange={(e) => setEditMailgunDomain(e.target.value)}
              placeholder="Mailgun sending domain"
            />
          )}
          {credentials.find((c) => c.id === editingId)?.category === 'email_marketing' && (
            <Input
              value={editWebhookSecret}
              onChange={(e) => setEditWebhookSecret(e.target.value)}
              placeholder="Webhook signing secret (whsec_…)"
            />
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {message && (
        <p
          className={`text-sm rounded-lg px-3 py-2 border ${
            messageKind === 'error'
              ? 'text-red-800 bg-red-50 border-red-200'
              : 'text-green-800 bg-green-50 border-green-200'
          }`}
        >
          {message}
        </p>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-gray-900">Email connections</h3>
        <ul className="space-y-3">
          {emailCreds.length === 0 && (
            <li className="text-sm text-gray-500">No email provider connected — campaigns use platform Resend unless BYOK-only is enabled.</li>
          )}
          {emailCreds.map((c) => (
            <li key={c.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{c.label}</p>
                  <Badge color="gray">{c.provider}</Badge>
                  {c.isDefault && <Badge color="primary">Default</Badge>}
                  <Badge color={c.status === 'active' ? 'success' : 'warning'}>{c.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">Key: {c.secretPrefix}</p>
                {typeof c.config?.lastVerificationError === 'string' && c.config.lastVerificationError && (
                  <p className="text-xs text-red-600 mt-1">Last error: {c.config.lastVerificationError}</p>
                )}
                {c.webhookUrl && (
                  <p className="text-xs text-gray-400 mt-1 break-all">
                    Webhook (paste in Resend): {c.webhookUrl}
                  </p>
                )}
                <p className="text-xs text-gray-400">Used {c.usageCount} times</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(c)}>
                  Edit
                </Button>
                {!c.isDefault && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDefault(c.id)}>
                    Set default
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => testConnection(c.id)}>
                  Test
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(c.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-gray-900">Data enrichment</h3>
        <p className="text-sm text-gray-500">
          Connect firmographic and contact enrichment APIs. Users pick a provider when enriching a contact from the CRM.
        </p>
        <ul className="space-y-3">
          {enrichmentCreds.length === 0 && (
            <li className="text-sm text-gray-500">No enrichment providers connected yet.</li>
          )}
          {enrichmentCreds.map((c) => (
            <li key={c.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{c.label}</p>
                  <Badge color="gray">{c.provider}</Badge>
                  {c.isDefault && <Badge color="primary">Default</Badge>}
                  <Badge color={c.status === 'active' ? 'success' : 'warning'}>{c.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">Key: {c.secretPrefix}</p>
                {typeof c.config?.lastVerificationError === 'string' && c.config.lastVerificationError && (
                  <p className="text-xs text-red-600 mt-1">Last error: {c.config.lastVerificationError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(c)}>
                  Edit
                </Button>
                {!c.isDefault && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDefault(c.id)}>
                    Set default
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => testConnection(c.id)}>
                  Test
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(c.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-gray-900">Chat widget AI</h3>
            <p className="text-sm text-gray-500 mt-1">
              When enabled, the widget uses your connected AI to reply to visitor messages. When disabled, no AI is used.
            </p>
          </div>
          <label className="flex items-center gap-2 shrink-0 cursor-pointer">
            <span className="text-sm text-gray-600">{widgetAiEnabled ? 'On' : 'Off'}</span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300"
              checked={widgetAiEnabled}
              disabled={busy}
              onChange={(e) => void saveAiSettings(e.target.checked)}
            />
          </label>
        </div>
        {widgetAiEnabled && aiCreds.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Add an Anthropic connection below before visitors receive AI replies.
          </p>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-gray-900">AI connections</h3>
        <ul className="space-y-3">
          {aiCreds.length === 0 && <li className="text-sm text-gray-500">No AI provider connected.</li>}
          {aiCreds.map((c) => (
            <li key={c.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{c.label}</p>
                  {c.isDefault && <Badge color="primary">Default</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-1">Key: {c.secretPrefix}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(c)}>
                  Edit
                </Button>
                {!c.isDefault && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDefault(c.id)}>
                    Set default
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => testConnection(c.id)}>
                  Test key
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(c.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Default AI connection</label>
            <select
              className="border border-gray-200 rounded-lg text-sm px-2 py-1.5"
              value={aiCredentialId}
              onChange={(e) => setAiCredentialId(e.target.value)}
            >
              <option value="">Auto (default connection)</option>
              {aiCreds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Model</label>
            <Input value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-56" />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={testAi}>
            Test AI reply
          </Button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-gray-900">Add connection</h3>
        <form onSubmit={addCredential} className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <select
              className="border border-gray-200 rounded-lg text-sm px-2 py-1.5"
              value={category}
              onChange={(e) => {
                const cat = e.target.value as 'email_marketing' | 'ai_chat' | 'data_enrichment';
                setCategory(cat);
                setProvider(
                  cat === 'ai_chat' ? 'anthropic' : cat === 'data_enrichment' ? 'people_data_labs' : 'resend'
                );
              }}
            >
              <option value="email_marketing">Email marketing</option>
              <option value="ai_chat">AI chat</option>
              <option value="data_enrichment">Data enrichment</option>
            </select>
            <select
              className="border border-gray-200 rounded-lg text-sm px-2 py-1.5"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {(category === 'email_marketing'
                ? EMAIL_PROVIDERS
                : category === 'ai_chat'
                  ? AI_PROVIDERS
                  : ENRICHMENT_PROVIDERS
              ).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Input placeholder="Label (e.g. Production Resend)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Input
            type="password"
            placeholder="API key / secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoComplete="off"
          />
          {category === 'email_marketing' && provider === 'resend' && (
            <p className="text-xs text-gray-500">
              Use a Resend key with <strong>Sending access</strong> — that is the correct key type for FlowChat email
              marketing. Full-access keys also work.
            </p>
          )}
          {provider === 'mailgun' && (
            <Input
              placeholder="Mailgun sending domain (e.g. mg.example.com)"
              value={mailgunDomain}
              onChange={(e) => setMailgunDomain(e.target.value)}
              required
            />
          )}
          {category === 'data_enrichment' && (provider === 'openmart' || provider === 'explorium') && (
            <Input
              placeholder="Optional API base URL (leave blank for default)"
              value={enrichmentBaseUrl}
              onChange={(e) => setEnrichmentBaseUrl(e.target.value)}
            />
          )}
          {category === 'email_marketing' && (
            <>
              <Input
                placeholder="Webhook signing secret (whsec_… from Resend)"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Optional. Add this after saving the connection — paste the webhook URL shown above into Resend, then enter the signing secret here via Edit or re-add.
              </p>
            </>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Add & verify'}
          </Button>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-gray-900">Policy</h3>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={byokOnly} onChange={(e) => setByokOnly(e.target.checked)} />
          Require tenant email credentials (disable platform Resend fallback)
        </label>
        <Button type="button" size="sm" onClick={savePolicy} disabled={busy}>
          Save policy
        </Button>
      </section>
    </div>
  );
}
