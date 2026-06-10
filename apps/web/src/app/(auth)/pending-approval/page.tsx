'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export default function PendingApprovalPage() {
  const { clearAuth } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4 text-2xl">
          ⏳
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Awaiting approval</h1>
        <p className="text-sm text-gray-600 mb-6">
          Your administrator has not approved your access yet. You cannot view websites, inboxes, or
          conversations until they activate your account.
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
          Workspace owners: use{' '}
          <Link href="/sign-up" className="text-primary-600 hover:underline">
            Create workspace
          </Link>{' '}
          with a company email.
        </p>
      </div>
    </div>
  );
}
