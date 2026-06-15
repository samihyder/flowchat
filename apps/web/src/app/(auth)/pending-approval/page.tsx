'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { AuthShell } from '@/components/layout/auth-shell';

export default function PendingApprovalPage() {
  const { clearAuth } = useAuthStore();

  return (
    <AuthShell title="Awaiting approval" subtitle="Your administrator will activate your account shortly.">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4 text-2xl">
          ⏳
        </div>
        <p className="text-sm text-gray-600 mb-6">
          You cannot view websites, inboxes, or conversations until an administrator approves your
          access and assigns inboxes.
        </p>
        <button
          type="button"
          onClick={() => {
            clearAuth();
            window.location.href = '/sign-in';
          }}
          className="text-sm text-primary-600 font-medium hover:underline"
        >
          Sign out
        </button>
        <p className="mt-4 text-xs text-gray-400">
          Workspace owners:{' '}
          <Link href="/sign-up" className="text-primary-600 hover:underline">
            Create workspace
          </Link>{' '}
          with a company email.
        </p>
      </div>
    </AuthShell>
  );
}
