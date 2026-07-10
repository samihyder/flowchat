'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { getApiUrl } from '@/lib/config';

type Target = 'wa-automation' | 'lead-monitor';

export function EcosystemNavItem({
  target,
  icon,
  label,
  path,
}: {
  target: Target;
  icon: string;
  label: string;
  path: string;
}) {
  const { token, accountId } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const open = async () => {
    if (!token || !accountId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/auth/ecosystem-handoff?target=${target}&accountId=${accountId}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        window.open(path, '_blank', 'noopener,noreferrer');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(path, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={loading}
      className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-white disabled:opacity-60"
    >
      <span className="w-4 text-center text-sm opacity-80">{icon}</span>
      <span className="truncate flex-1 text-left">{loading ? 'Opening…' : label}</span>
    </button>
  );
}
