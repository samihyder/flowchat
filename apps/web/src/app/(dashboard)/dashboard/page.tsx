'use client';

import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Conversations</h1>
      </header>

      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <path d="M4 4h16v12H7l-3 4V4z" fill="none" stroke="#4F46E5" strokeWidth="1.5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Welcome, {user?.name.split(' ')[0]}!
          </h2>
          <p className="text-gray-500 text-sm max-w-xs">
            No conversations yet. Create an inbox in Settings to start receiving messages.
          </p>
        </div>
      </div>
    </>
  );
}
