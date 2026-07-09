'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Contact } from '@/lib/api';

type Step = 'idle' | 'setup' | 'backup_codes' | 'disable' | 'regenerate';

type SessionRow = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  rememberMe: boolean;
  isCurrent: boolean;
};

type BlockedEntry = {
  id: string;
  type: 'ip' | 'contact';
  value: string;
  reason: string | null;
  blockedAt: string | null;
};

function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = /edg\//i.test(userAgent)
    ? 'Edge'
    : /chrome\//i.test(userAgent)
      ? 'Chrome'
      : /firefox\//i.test(userAgent)
        ? 'Firefox'
        : /safari\//i.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const os = /windows/i.test(userAgent)
    ? 'Windows'
    : /mac os x|macintosh/i.test(userAgent)
      ? 'macOS'
      : /android/i.test(userAgent)
        ? 'Android'
        : /iphone|ipad/i.test(userAgent)
          ? 'iOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function SecurityPage() {
  const { token, accountId } = useAuthStore();
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [success, setSuccess] = useState('');

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockType, setBlockType] = useState<'ip' | 'contact'>('ip');
  const [blockValue, setBlockValue] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.auth.me(token).then((res) => setEnabled(res.user.totpEnabled)).catch(() => {});
  }, [token]);

  const loadSessions = () => {
    if (!token) return;
    setSessionsLoading(true);
    api.auth.sessions
      .list(token)
      .then((res) => setSessions(res.sessions))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  };

  useEffect(loadSessions, [token]);

  const loadBlocked = () => {
    if (!token || !accountId) return;
    setBlockedLoading(true);
    api.blockedVisitors
      .list(accountId, token)
      .then((res) => setBlocked(res.entries))
      .catch(() => setBlocked([]))
      .finally(() => setBlockedLoading(false));
  };

  useEffect(loadBlocked, [token, accountId]);

  useEffect(() => {
    if (!accountId || !token || blockType !== 'contact' || contactQuery.trim().length < 2) {
      setContactResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.contacts
        .list(accountId, token, { q: contactQuery, limit: 5 })
        .then((res) => setContactResults(res.contacts))
        .catch(() => setContactResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [accountId, token, blockType, contactQuery]);

  const revokeSession = async (id: string) => {
    if (!token) return;
    setRevokingId(id);
    try {
      await api.auth.sessions.revoke(id, token);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRevokingId(null);
    }
  };

  const submitBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !token) return;
    setBlockBusy(true);
    setBlockError('');
    try {
      if (blockType === 'ip') {
        if (!blockValue.trim()) throw new Error('Enter an IP address');
        await api.blockedVisitors.block(accountId, { type: 'ip', value: blockValue.trim(), reason: blockReason.trim() || undefined }, token);
      } else {
        if (!selectedContact) throw new Error('Select a contact');
        await api.blockedVisitors.block(
          accountId,
          { type: 'contact', contactId: selectedContact.id, reason: blockReason.trim() || undefined },
          token
        );
      }
      setBlockFormOpen(false);
      setBlockValue('');
      setBlockReason('');
      setContactQuery('');
      setSelectedContact(null);
      loadBlocked();
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Failed to block');
    } finally {
      setBlockBusy(false);
    }
  };

  const unblock = async (entry: BlockedEntry) => {
    if (!accountId || !token) return;
    setUnblockingId(entry.id);
    try {
      await api.blockedVisitors.unblock(accountId, entry.id, entry.type, token);
      setBlocked((prev) => prev.filter((b) => b.id !== entry.id));
    } finally {
      setUnblockingId(null);
    }
  };

  const startSetup = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.twoFa.setup(token);
      setSecret(res.secret);
      setUri(res.uri);
      setStep('setup');
    } catch (err: any) {
      if (err.message === '2FA already enabled') setEnabled(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.twoFa.enable(code, token);
      setBackupCodes(res.backupCodes);
      setEnabled(true);
      setStep('backup_codes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await api.twoFa.disable(disableCode, token);
      setEnabled(false);
      setStep('idle');
      setDisableCode('');
      setSuccess('2FA has been disabled.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.twoFa.regenerateBackupCodes(regenerateCode, token);
      setBackupCodes(res.backupCodes);
      setRegenerateCode('');
      setStep('backup_codes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Security</h2>
        <p className="text-sm text-gray-500">Manage two-factor authentication, active sessions, and blocked visitors.</p>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {/* 2FA Status */}
      {step === 'idle' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Two-factor authentication</h3>
              <p className="text-sm text-gray-500 mt-1">
                {enabled
                  ? 'Your account is protected with an authenticator app.'
                  : 'Add an extra layer of security using an authenticator app.'}
              </p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            {!enabled ? (
              <button
                onClick={startSetup}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Loading…' : 'Set up 2FA'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setStep('regenerate'); setError(''); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Regenerate backup codes
                </button>
                <button
                  onClick={() => { setStep('disable'); setError(''); }}
                  className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Disable 2FA
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Setup — scan QR / enter secret */}
      {step === 'setup' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 1 — Add to authenticator app</h3>
            <p className="text-sm text-gray-500 mb-4">
              Open Google Authenticator, Authy, or 1Password and scan the QR code, or enter the secret manually.
            </p>

            <div className="flex items-start gap-5">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(uri)}`}
                  alt="TOTP QR Code"
                  className="w-40 h-40"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Or enter this secret manually:</p>
                <code className="block bg-gray-100 text-gray-800 text-xs font-mono px-3 py-2 rounded-lg break-all select-all">
                  {secret}
                </code>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 2 — Verify</h3>
            <form onSubmit={handleEnable} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Enter 6-digit code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Verifying…' : 'Enable 2FA'}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <button onClick={() => setStep('idle')} className="text-sm text-gray-500 hover:text-gray-700">
            ← Cancel
          </button>
        </div>
      )}

      {/* Backup codes — shown once */}
      {step === 'backup_codes' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500">✓</span>
            <h3 className="text-sm font-semibold text-gray-900">Backup codes ready</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Save these backup codes somewhere safe. Each can only be used once to sign in if you lose your authenticator.
            Any codes from before this point no longer work.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {backupCodes.map((bc) => (
              <code key={bc} className="bg-gray-100 text-gray-800 text-xs font-mono px-3 py-2 rounded-lg text-center">
                {bc}
              </code>
            ))}
          </div>
          <button
            onClick={() => setStep('idle')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            I've saved my codes
          </button>
        </div>
      )}

      {/* Regenerate backup codes flow */}
      {step === 'regenerate' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Regenerate backup codes</h3>
          <p className="text-sm text-gray-500 mb-4">
            Enter your authenticator code to confirm. This invalidates all of your existing backup codes.
          </p>
          <form onSubmit={handleRegenerate} className="flex gap-3 items-end">
            <div className="flex-1">
              <input
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value.trim())}
                placeholder="6-digit code or backup code"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !regenerateCode}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button onClick={() => { setStep('idle'); setError(''); }} className="mt-3 text-sm text-gray-500 hover:text-gray-700">
            ← Cancel
          </button>
        </div>
      )}

      {/* Disable flow */}
      {step === 'disable' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Disable 2FA</h3>
          <p className="text-sm text-gray-500 mb-4">Enter your authenticator code or a backup code to confirm.</p>
          <form onSubmit={handleDisable} className="flex gap-3 items-end">
            <div className="flex-1">
              <input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.trim())}
                placeholder="6-digit code or backup code"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !disableCode}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Disabling…' : 'Disable'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button onClick={() => { setStep('idle'); setError(''); }} className="mt-3 text-sm text-gray-500 hover:text-gray-700">
            ← Cancel
          </button>
        </div>
      )}

      {/* Active sessions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Active sessions</h3>
        <p className="text-sm text-gray-500 mb-4">Devices currently signed in to your account.</p>
        {sessionsLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No active sessions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 font-medium">Device</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Last active</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3 text-gray-800">
                      {describeDevice(s.userAgent)}
                      {s.isCurrent && (
                        <span className="ml-2 text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                          This device
                        </span>
                      )}
                      {s.rememberMe && <span className="ml-2 text-[10px] text-gray-400">Remembered</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-500 font-mono text-xs">{s.ipAddress ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{formatRelative(s.lastSeenAt)}</td>
                    <td className="py-2.5 text-right">
                      {!s.isCurrent && (
                        <button
                          onClick={() => void revokeSession(s.id)}
                          disabled={revokingId === s.id}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          {revokingId === s.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Blocked visitors */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Blocked visitors</h3>
        <p className="text-sm text-gray-500 mb-4">
          Block by IP address or contact. Blocked sources are denied on the widget.
        </p>
        {blockedLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : blocked.length === 0 ? (
          <p className="text-sm text-gray-400 mb-3">No blocked visitors.</p>
        ) : (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Blocked</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={`${b.type}-${b.id}`} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          b.type === 'ip' ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {b.type === 'ip' ? 'IP' : 'Contact'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-800 font-mono text-xs">{b.value}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{b.reason ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-500">
                      {b.blockedAt ? new Date(b.blockedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => void unblock(b)}
                        disabled={unblockingId === b.id}
                        className="text-xs text-primary-600 hover:underline disabled:opacity-50"
                      >
                        {unblockingId === b.id ? 'Unblocking…' : 'Unblock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!blockFormOpen ? (
          <button
            onClick={() => setBlockFormOpen(true)}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors"
          >
            + Block IP or contact
          </button>
        ) : (
          <form onSubmit={submitBlock} className="border border-gray-100 rounded-lg p-3 space-y-2.5">
            <div className="flex gap-2">
              {(['ip', 'contact'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setBlockType(t); setBlockError(''); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                    blockType === t
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200'
                  }`}
                >
                  {t === 'ip' ? 'IP address' : 'Contact'}
                </button>
              ))}
            </div>

            {blockType === 'ip' ? (
              <input
                value={blockValue}
                onChange={(e) => setBlockValue(e.target.value)}
                placeholder="e.g. 203.0.113.42"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono"
              />
            ) : (
              <div className="relative">
                <input
                  value={selectedContact ? selectedContact.name : contactQuery}
                  onChange={(e) => {
                    setSelectedContact(null);
                    setContactQuery(e.target.value);
                  }}
                  placeholder="Search contact by name or email…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
                {!selectedContact && contactResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {contactResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedContact(c);
                          setContactResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {c.name} <span className="text-gray-400">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />

            {blockError && <p className="text-xs text-red-600">{blockError}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={blockBusy}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {blockBusy ? 'Blocking…' : 'Block'}
              </button>
              <button
                type="button"
                onClick={() => { setBlockFormOpen(false); setBlockError(''); }}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
