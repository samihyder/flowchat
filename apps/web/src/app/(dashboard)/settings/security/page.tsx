'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

type Step = 'idle' | 'setup' | 'backup_codes' | 'disable';

export default function SecurityPage() {
  const { token } = useAuthStore();
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) return;
    api.auth.me(token).then((res) => setEnabled(res.user.totpEnabled)).catch(() => {});
  }, [token]);

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

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Security</h2>
        <p className="text-sm text-gray-500">Manage two-factor authentication for your account.</p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
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
              <button
                onClick={() => { setStep('disable'); setError(''); }}
                className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
              >
                Disable 2FA
              </button>
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

            {/* QR Code via API */}
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
            <h3 className="text-sm font-semibold text-gray-900">2FA enabled</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Save these backup codes somewhere safe. Each can only be used once to sign in if you lose your authenticator.
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
    </div>
  );
}
