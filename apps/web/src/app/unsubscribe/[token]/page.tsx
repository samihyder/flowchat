'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/lib/config';

export default function UnsubscribePage() {
  const params = useParams();
  const token = params.token as string;
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const unsubscribe = async () => {
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/public/unsubscribe/${token}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Unsubscribe failed');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unsubscribe failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center space-y-4">
        {done ? (
          <>
            <h1 className="text-lg font-semibold text-gray-900">You&apos;re unsubscribed</h1>
            <p className="text-sm text-gray-500">You won&apos;t receive marketing emails from this sender anymore.</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Unsubscribe</h1>
            <p className="text-sm text-gray-500">Stop receiving marketing emails from this workspace.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="button" onClick={() => void unsubscribe()}>
              Confirm unsubscribe
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
