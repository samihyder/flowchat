'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { ALARM_PRESETS, DEFAULT_ALARM_PRESET_ID, playVisitorAlarm } from '@/lib/visitor-alarm';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NotificationsSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selected, setSelected] = useState(DEFAULT_ALARM_PRESET_ID);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Separate from `error` (save-time failures): if the initial admin-check
  // fetch itself fails, we must not fall through to the "not admin" view —
  // that would misreport a network/server error as a permissions denial.
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([api.account.get(accountId, token), api.contacts.access(accountId, token)])
      .then(([accountRes, access]) => {
        setIsAdmin(access.isAdmin);
        setSelected(accountRes.account.settings?.visitorAlarmSoundId || DEFAULT_ALARM_PRESET_ID);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Failed to load notification settings.')
      )
      .finally(() => setLoaded(true));
  }, [token, accountId]);

  const save = async () => {
    if (!token || !accountId || !isAdmin) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.account.update(accountId, { settings: { visitorAlarmSoundId: selected } }, token);
      setMessage('Notification sound saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-gray-500">
          Only administrators can configure notification sounds.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader
          title="Visitor alert sound"
          description="Plays across the web dashboard and the installed app whenever a new visitor lands on your website chat."
        />
        <CardBody className="space-y-3">
          {Object.entries(ALARM_PRESETS).map(([id, preset]) => (
            <label
              key={id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                selected === id ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="alarm-preset"
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                />
                <span className="text-sm font-medium text-gray-900">{preset.label}</span>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => playVisitorAlarm(id)}
              >
                ▶ Preview
              </Button>
            </label>
          ))}
          <div className="pt-2">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
