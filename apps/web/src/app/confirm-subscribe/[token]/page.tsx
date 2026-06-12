'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/config';

export default function ConfirmSubscribePage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    fetch(`${getApiUrl()}/public/confirm-subscribe/${token}`, { method: 'POST' })
      .then((res) => setStatus(res.ok ? 'done' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center space-y-4">
        {status === 'loading' && <p className="text-sm text-gray-500">Confirming your subscription…</p>}
        {status === 'done' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">You&apos;re subscribed</h1>
            <p className="text-sm text-gray-500">Thanks for confirming. You&apos;ll receive marketing emails from this sender.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Link invalid</h1>
            <p className="text-sm text-gray-500">This confirmation link is invalid or has already been used.</p>
          </>
        )}
      </div>
    </div>
  );
}
