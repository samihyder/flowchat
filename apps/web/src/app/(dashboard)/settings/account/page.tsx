'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { parseInviteDomainsText } from '@/lib/invite-domain';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { labelClass, selectClass } from '@/components/ui/form-field';
import { AnnotationBox, SettingsCard } from '@/components/ui/settings-page';
import { Button } from '@/components/ui/button';
import { ImageUploadWithCrop } from '@/components/media/image-upload-with-crop';
import { InfoHint } from '@/components/media/info-hint';
import { getBrowserTimezone } from '@/lib/timezone';
import { ACCOUNT_LOGO_MAX_BYTES, ACCOUNT_LOGO_SERVER_MAX_BYTES, ACCOUNT_LOGO_SIZE_PX } from '@/lib/branding/logo';
import { presetsForFeature } from '@/lib/media/image-presets';

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
  const { token, accountId, setAuth, user } = useAuthStore();
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
  const [slug, setSlug] = useState('');
  const timezoneOptions = useMemo(() => {
    const browser = getBrowserTimezone();
    return TIMEZONES.includes(browser) ? TIMEZONES : [browser, ...TIMEZONES];
  }, []);

  useEffect(() => {
    if (!token || !accountId) return;
    api.account.get(accountId, token).then((res) => {
      setName(res.account.name);
      const tz = res.account.timezone;
      setTimezone(!tz || tz === 'UTC' ? getBrowserTimezone() : tz);
      setLocale(res.account.locale);
      setLogoUrl(res.account.logoUrl);
      setSlug(res.account.slug);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!token || !accountId) return;
    if (file.size > ACCOUNT_LOGO_MAX_BYTES) {
      setError(`Logo must be ${ACCOUNT_LOGO_MAX_BYTES / (1024 * 1024)} MB or smaller.`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      if (file.size <= ACCOUNT_LOGO_SERVER_MAX_BYTES) {
        const res = await api.account.uploadLogo(accountId, file, token);
        setLogoUrl(res.publicUrl);
        setSuccess('Logo updated.');
        return;
      }

      const contentType = file.type || 'image/png';
      const { uploadUrl, publicUrl } = await api.account.getLogoUploadUrl(accountId, token, contentType);
      let putRes: Response;
      try {
        putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': contentType },
        });
      } catch {
        throw new Error(
          'Could not upload to storage. Enable CORS on your R2 bucket for browser uploads, or use a file under 4 MB.'
        );
      }
      if (!putRes.ok) {
        throw new Error(`Storage upload failed (${putRes.status}). Check R2 bucket CORS and public access.`);
      }
      await api.account.update(accountId, { logoUrl: publicUrl }, token);
      setLogoUrl(publicUrl);
      setSuccess('Logo updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(
        msg === 'Storage not configured' || msg.includes('not configured')
          ? 'Logo upload requires R2 configuration on the web service.'
          : msg
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SettingsCard title="Workspace identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Workspace name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Workspace slug</label>
            <Input value={slug} disabled className="bg-gray-50 font-mono" />
            <p className="text-[11px] text-gray-400 mt-1">Unique workspace identifier, assigned at creation</p>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className={labelClass}>Logo</label>
            <InfoHint label="Logo size guidance">
              Upload opens a crop &amp; resize tool. Prefer the Workspace logo preset
              ({ACCOUNT_LOGO_SIZE_PX}×{ACCOUNT_LOGO_SIZE_PX} px) so the mark stays sharp in the
              sidebar and email signatures. Max {ACCOUNT_LOGO_MAX_BYTES / (1024 * 1024)} MB after
              export.
            </InfoHint>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="rounded-xl border-2 border-dashed border-primary-200 overflow-hidden bg-primary-50/30 flex items-center justify-center shrink-0"
              style={{
                width: Math.min(ACCOUNT_LOGO_SIZE_PX, 128),
                height: Math.min(ACCOUNT_LOGO_SIZE_PX, 128),
                maxWidth: '100%',
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  width={ACCOUNT_LOGO_SIZE_PX}
                  height={ACCOUNT_LOGO_SIZE_PX}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">Logo</span>
              )}
            </div>
            <div>
              <ImageUploadWithCrop
                buttonLabel={uploading ? 'Uploading…' : 'Upload & crop logo'}
                disabled={uploading}
                defaultPresetId="logo"
                allowedPresetIds={presetsForFeature('account-logo')}
                title="Crop workspace logo"
                info={
                  <>
                    Crop to a square, then export at {ACCOUNT_LOGO_SIZE_PX}×{ACCOUNT_LOGO_SIZE_PX} for
                    best results. You can also pick Free crop or Custom size if needed.
                  </>
                }
                onReady={(file) => void handleLogoUpload(file)}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                PNG recommended · max {ACCOUNT_LOGO_MAX_BYTES / (1024 * 1024)} MB · default{' '}
                {ACCOUNT_LOGO_SIZE_PX}×{ACCOUNT_LOGO_SIZE_PX}px
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Locale & time">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Used for campaign send-time rules. Email automations use your computer&apos;s local time when scheduling.
            </p>
          </div>
          <div>
            <label className={labelClass}>Locale</label>
            <select value={locale} onChange={(e) => setLocale(e.target.value)} className={selectClass}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Agent invite policy">
        <div>
          <label className={labelClass}>Allowed email domains (optional)</label>
          <Textarea
            value={inviteDomainsText}
            onChange={(e) => setInviteDomainsText(e.target.value)}
            rows={3}
            placeholder="company.com"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">One per line. Leave blank to allow any work email.</p>
        </div>
        <AnnotationBox>
          Restricts agent invites to company email patterns. Prevents accidental external invites.
        </AnnotationBox>
      </SettingsCard>

      <SettingsCard title="Data retention">
        <div className="max-w-xs">
          <label className={labelClass}>Visitor data retention (days)</label>
          <Input
            type="number"
            min={30}
            max={3650}
            value={dataRetentionDays}
            onChange={(e) => setDataRetentionDays(Number(e.target.value) || 365)}
          />
        </div>
        <AnnotationBox>
          GDPR baseline — inactive visitors are purged automatically. Export/delete via visitor GDPR API.
        </AnnotationBox>
      </SettingsCard>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
