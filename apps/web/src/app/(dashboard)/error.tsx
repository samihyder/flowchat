'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
          !
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          The dashboard hit an unexpected error. Try again, or sign out and back in if the problem
          persists.
        </p>
        {error.message && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-left font-mono break-words">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="text-[11px] text-gray-400 font-mono mb-4">Ref: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/sign-in">
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
