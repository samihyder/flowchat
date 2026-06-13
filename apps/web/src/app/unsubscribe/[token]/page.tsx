'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/lib/config';

type Preference = 'all' | 'reduced' | 'none';

export default function UnsubscribePage() {
  const params = useParams();
  const token = params.token as string;
  const [done, setDone] = useState(false);
  const [choice, setChoice] = useState<Preference | null>(null);
  const [error, setError] = useState('');

  const submit = async (preference: Preference) => {
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/public/unsubscribe/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Update failed');
      }
      setChoice(preference);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full space-y-4">
        {done ? (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Preferences saved</h1>
            <p className="text-sm text-gray-500">
              {choice === 'none' && 'You are unsubscribed from all marketing emails.'}
              {choice === 'reduced' && 'You will only receive important automation emails, not broadcasts.'}
              {choice === 'all' && 'You are subscribed to marketing emails.'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Email preferences</h1>
            <p className="text-sm text-gray-500">Choose how you want to hear from us.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="space-y-2 text-left">
              <button
                type="button"
                onClick={() => void submit('reduced')}
                className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
              >
                <p className="font-medium text-sm">Reduce emails</p>
                <p className="text-xs text-gray-500">Only automation emails, no newsletters or campaigns</p>
              </button>
              <button
                type="button"
                onClick={() => void submit('none')}
                className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
              >
                <p className="font-medium text-sm">Unsubscribe from all marketing</p>
                <p className="text-xs text-gray-500">No promotional emails</p>
              </button>
            </div>
            <Button type="button" variant="secondary" className="w-full" onClick={() => void submit('all')}>
              Keep me subscribed
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
