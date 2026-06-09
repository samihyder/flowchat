'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = params.get('token');
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userEmail = params.get('userEmail');
    const accountId = params.get('accountId');
    const accountName = params.get('accountName');

    if (token && userId && userName && userEmail && accountId && accountName) {
      setAuth(
        { id: userId, name: userName, email: userEmail },
        token,
        accountId,
        accountName
      );
      router.replace('/dashboard');
      return;
    }

    router.replace('/sign-in?error=oauth_failed');
  }, [params, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
