'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { parseInviteDomainsText } from '@/lib/invite-domain';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland',
];

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'hi', label: 'Hindi' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'tr', label: 'Turkish' },
  { value: 'zh', label: 'Chinese' },
];

export default function AccountSettingsPage() {
  const { token, accountId, accountName, setAuth, user } = useAuthStore();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inviteDomainsText, setInviteDomainsText] = useState('');
  const [dataRetentionDays, setDataRetentionDays] = useState(365);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token || !accountId) return;
    api.account.get(accountId, token).then((res) => {
      setName(res.account.name);
      setTimezone(res.account.timezone);
      setLocale(res.account.locale);
      setLogoUrl(res.account.logoUrl);
      setInviteDomainsText((res.account.settings?.allowedInviteDomains ?? []).join('\n'));
      setDataRetentionDays(res.account.settings?.dataRetentionDays ?? 365);
    }).catch(() => {});
  }, [token, accountId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.account.update(
        accountId,
        {
          name,
          timezone,
          locale,
          settings: {
            allowedInviteDomains: parseInviteDomainsText(inviteDomainsText),
            dataRetentionDays,
          },
        },
        token
      );
      setSuccess('Settings saved.');
      setAuth(user, token, accountId, res.account.name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !accountId) return;
    setUploading(true);
    setError('');
    try {
      const { uploadUrl, publicUrl } = await api.account.getLogoUploadUrl(accountId, token);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/png' } });
      await api.account.update(accountId, { logoUrl: publicUrl }, token);
      setLogoUrl(publicUrl);
      setSuccess('Logo updated.');
    } catch (err: any) {
      setError(err.message === 'Storage not configured' ? 'Logo upload requires R2 configuration.' : err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Account Settings</h2>
        <p className="text-sm text-gray-500">Manage your workspace details.</p>
      </div>

      {/* Logo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-600">
                {name.charAt(0).toUpperCase() || 'F'}
              </span>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {uploading ? 'Uploading…' : 'Upload Logo'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">PNG or JPG, max 2MB</p>
          </div>
        </div>
      </div>

      {/* Settings form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Compliance & access</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Allowed invite domains <span className="text-gray-400 font-normal">(one per line, empty = any work email)</span>
              </label>
              <textarea
                value={inviteDomainsText}
                onChange={(e) => setInviteDomainsText(e.target.value)}
                rows={3}
                placeholder="company.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Visitor data retention (days)
              </label>
              <input
                type="number"
                min={30}
                max={3650}
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(Number(e.target.value) || 365)}
                className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Inactive visitors are purged automatically (min 30 days). Export/delete via visitor GDPR API.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
