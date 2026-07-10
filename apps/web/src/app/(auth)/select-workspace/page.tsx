'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type AdminWorkspace } from '@/lib/api';
import { AuthLogo } from '@/components/layout/auth-shell';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export default function SelectWorkspacePage() {
  const router = useRouter();
  const { token, user, isSuperAdmin, setAccount, clearAuth } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/sign-in');
      return;
    }
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    api.auth
      .workspaces(token)
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => setError('Failed to load workspaces'))
      .finally(() => setLoading(false));
  }, [token, isSuperAdmin, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) => w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q)
    );
  }, [workspaces, search]);

  const enterWorkspace = async (w: AdminWorkspace) => {
    if (!token) return;
    setEnteringId(w.id);
    setError('');
    try {
      const res = await api.auth.selectWorkspace(w.id, token);
      setAccount(res.account.id, res.account.name);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter workspace');
      setEnteringId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-[#F0FDF4] to-white px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <AuthLogo centered={false} />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                clearAuth();
                router.push('/sign-in');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 text-primary-700 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-3">
            Super admin
          </div>
          <h1 className="text-[28px] font-bold text-gray-900">Select a workspace</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            You have full access to every workspace on this platform. Choose one to continue.
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workspaces…"
          className="w-full max-w-sm mb-6 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading workspaces…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400">No workspaces match &ldquo;{search}&rdquo;.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={enteringId !== null}
                onClick={() => void enterWorkspace(w)}
                className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary-300 transition-all disabled:opacity-60 group"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials(w.name)}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      STATUS_STYLES[w.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                  {w.name}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{w.slug}</p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <span>{w.userCount} user{w.userCount === 1 ? '' : 's'}</span>
                  <span>{w.contactCount} contact{w.contactCount === 1 ? '' : 's'}</span>
                  <span>{w.inboxCount} inbox{w.inboxCount === 1 ? '' : 'es'}</span>
                </div>
                <p className="text-[11px] text-primary-600 font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {enteringId === w.id ? 'Entering…' : 'Enter workspace →'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
