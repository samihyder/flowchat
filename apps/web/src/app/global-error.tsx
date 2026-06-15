'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Application error</h1>
          <p className="text-sm text-gray-500 mb-6">
            FlowChat could not load this page. Please try again.
          </p>
          {error.digest && (
            <p className="text-[11px] text-gray-400 font-mono mb-4">Ref: {error.digest}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => reset()}>
              Try again
            </Button>
            <Link href="/sign-in" className="text-sm text-primary-600 hover:underline">
              Go to sign in
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
