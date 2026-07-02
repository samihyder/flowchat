'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, email: string) => Promise<void>;
};

export function ContactCreateModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreate(name.trim(), email.trim());
      setName('');
      setEmail('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900">New contact</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="new-contact-name" className="text-xs text-gray-500 block mb-1">
              Name
            </label>
            <Input id="new-contact-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label htmlFor="new-contact-email" className="text-xs text-gray-500 block mb-1">
              Email
            </label>
            <Input id="new-contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : 'Create contact'}
          </Button>
        </div>
      </form>
    </div>
  );
}
