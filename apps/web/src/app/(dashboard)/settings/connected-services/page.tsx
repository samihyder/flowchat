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

export default function ConnectedServicesPage() {
  const { token, accountId } = useAuthStore();
  const [credentials, setCredentials] = useState<ServiceCredential[]>([]);
  const [byokOnly, setByokOnly] = useState(false);
  const [widgetAiEnabled, setWidgetAiEnabled] = useState(false);
  const [aiCredentialId, setAiCredentialId] = useState('');
  const [aiModel, setAiModel] = useState('claude-3-5-haiku-20241022');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<'email_marketing' | 'ai_chat'>('email_marketing');
  const [provider, setProvider] = useState('resend');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [mailgunDomain, setMailgunDomain] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

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

  const addCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setBusy(true);
    setMessage('');
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
            (category === 'ai_chat' && aiCreds.length === 0),
        },
        token
      );
      setLabel('');
      setSecret('');
      setMailgunDomain('');
      setWebhookSecret('');
      setMessage('Connection added and verified.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add connection');
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async (id: string) => {
    if (!token || !accountId) return;
    setMessage('');
    try {
      await api.serviceCredentials.test(accountId, id, token);
      setMessage('Connection test passed.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Test failed');
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
    load();
  };

  const saveAiSettings = async (enabled: boolean) => {
    if (!token || !accountId) return;
    setWidgetAiEnabled(enabled);
    setBusy(true);
    try {
      await api.account.update(accountId, { settings: { widgetAiEnabled: enabled } }, token);
      setMessage(enabled ? 'AI enabled for chat widget.' : 'AI disabled for chat widget.');
    } catch (err) {
      setWidgetAiEnabled(!enabled);
      setMessage(err instanceof Error ? err.message : 'Failed to save AI setting');
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
    setMessage('Workspace policy saved.');
  };

  const testAi = async () => {
    if (!token || !accountId) return;
    setMessage('');
    try {
      const r = await api.ai.chat(
        accountId,
        { messages: [{ role: 'user', content: 'Reply with exactly: OK' }], credentialId: aiCredentialId || undefined },
        token
      );
      setMessage(`AI test: ${r.text.slice(0, 120)}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'AI test failed');
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Connected services</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bring your own API keys for email marketing (Resend, SendGrid, Mailgun) and AI (Claude). Keys are encrypted at rest.
        </p>
      </div>

      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{message}</p>
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
                {c.webhookUrl && (
                  <p className="text-xs text-gray-400 mt-1 break-all">Webhook: {c.webhookUrl}</p>
                )}
                <p className="text-xs text-gray-400">Used {c.usageCount} times</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
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
                setCategory(e.target.value as 'email_marketing' | 'ai_chat');
                setProvider(e.target.value === 'ai_chat' ? 'anthropic' : 'resend');
              }}
            >
              <option value="email_marketing">Email marketing</option>
              <option value="ai_chat">AI chat</option>
            </select>
            <select
              className="border border-gray-200 rounded-lg text-sm px-2 py-1.5"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {(category === 'email_marketing' ? EMAIL_PROVIDERS : AI_PROVIDERS).map((p) => (
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
          {provider === 'mailgun' && (
            <Input
              placeholder="Mailgun sending domain (e.g. mg.example.com)"
              value={mailgunDomain}
              onChange={(e) => setMailgunDomain(e.target.value)}
              required
            />
          )}
          {category === 'email_marketing' && (
            <Input
              placeholder="Webhook signing secret (optional)"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
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
