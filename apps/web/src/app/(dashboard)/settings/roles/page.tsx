'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type CustomRole, type SamlConfig } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsCard } from '@/components/ui/settings-page';
import { checkboxClass, labelClass } from '@/components/ui/form-field';

export default function RolesSettingsPage() {
  const { token, accountId } = useAuthStore();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saml, setSaml] = useState({
    idpSsoUrl: '',
    idpEntityId: '',
    idpCertificate: '',
    isEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [savingSaml, setSavingSaml] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const [rolesRes, samlRes] = await Promise.all([
      api.roles.list(accountId, token),
      api.saml.get(accountId, token),
    ]);
    setRoles(rolesRes.roles);
    const c = samlRes.config as SamlConfig | null;
    if (c) {
      setSaml({
        idpSsoUrl: c.idpSsoUrl ?? '',
        idpEntityId: c.idpEntityId ?? '',
        idpCertificate: c.idpCertificate ?? '',
        isEnabled: c.isEnabled,
      });
    }
  }, [token, accountId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.roles.create(
        accountId,
        { name: name.trim(), description: description.trim() || null, permissions: {} },
        token
      );
      setName('');
      setDescription('');
      setMessage('Role created.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: CustomRole) => {
    if (!token || !accountId || !confirm(`Delete role "${role.name}"?`)) return;
    try {
      await api.roles.remove(accountId, role.id, token);
      setMessage(`Deleted "${role.name}".`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleSaveSaml = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    setSavingSaml(true);
    setError('');
    setMessage('');
    try {
      await api.saml.upsert(
        accountId,
        {
          idpSsoUrl: saml.idpSsoUrl.trim() || null,
          idpEntityId: saml.idpEntityId.trim() || null,
          idpCertificate: saml.idpCertificate.trim() || null,
          isEnabled: saml.isEnabled,
        },
        token
      );
      setMessage('SAML config saved.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save SAML');
    } finally {
      setSavingSaml(false);
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard title="Create custom role">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className={labelClass}>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Team lead" />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create role'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </SettingsCard>

      <SettingsCard title="Custom roles">
        {roles.length === 0 ? (
          <p className="text-sm text-gray-500">No custom roles yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {roles.map((role) => (
              <li key={role.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{role.name}</p>
                  {role.description && (
                    <p className="text-xs text-gray-400">{role.description}</p>
                  )}
                </div>
                <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(role)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard title="SAML SSO">
        <form onSubmit={handleSaveSaml} className="space-y-3">
          <div>
            <label className={labelClass}>IdP SSO URL</label>
            <Input
              value={saml.idpSsoUrl}
              onChange={(e) => setSaml({ ...saml, idpSsoUrl: e.target.value })}
              placeholder="https://idp.example.com/sso"
            />
          </div>
          <div>
            <label className={labelClass}>IdP entity ID</label>
            <Input
              value={saml.idpEntityId}
              onChange={(e) => setSaml({ ...saml, idpEntityId: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Certificate</label>
            <Textarea
              value={saml.idpCertificate}
              onChange={(e) => setSaml({ ...saml, idpCertificate: e.target.value })}
              rows={4}
              className="font-mono text-xs"
              placeholder="-----BEGIN CERTIFICATE-----"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={saml.isEnabled}
              onChange={(e) => setSaml({ ...saml, isEnabled: e.target.checked })}
            />
            Enable SAML SSO
          </label>
          <Button type="submit" disabled={savingSaml}>
            {savingSaml ? 'Saving…' : 'Save SAML'}
          </Button>
        </form>
      </SettingsCard>
    </div>
  );
}
