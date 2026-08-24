'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSegment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (firstName: string, lastName: string, email: string, listIds: string[]) => Promise<void>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactCreateModal({ open, onClose, onCreate }: Props) {
  const { token, accountId } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [lists, setLists] = useState<MarketingSegment[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !token || !accountId) return;
    api.marketing.segments
      .list(accountId, token)
      .then((r) => setLists(r.segments.filter((s) => s.segmentType === 'static')))
      .catch(() => setLists([]));
  }, [open, token, accountId]);

  if (!open) return null;

  const toggleList = (id: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = firstName.trim() && lastName.trim() && emailValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await onCreate(firstName.trim(), lastName.trim(), email.trim(), [...selectedListIds]);
      setFirstName('');
      setLastName('');
      setEmail('');
      setSelectedListIds(new Set());
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-contact-first-name" className="text-xs text-gray-500 block mb-1">
                First name <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-contact-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="new-contact-last-name" className="text-xs text-gray-500 block mb-1">
                Last name <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-contact-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="new-contact-email" className="text-xs text-gray-500 block mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="new-contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {email.trim() && !emailValid && (
              <p className="text-xs text-red-600 mt-1">Enter a valid email address</p>
            )}
          </div>
          {lists.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 block mb-1.5">Add to list (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {lists.map((l) => {
                  const active = selectedListIds.has(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleList(l.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-primary-50 text-primary-700 border-primary-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {active ? '✓ ' : ''}
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || saving}>
            {saving ? 'Saving…' : 'Create contact'}
          </Button>
        </div>
      </form>
    </div>
  );
}
