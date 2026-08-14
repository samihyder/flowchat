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
      className="group flex items-center gap-2.5 mx-2 px-3 py-2.5 sm:py-2 rounded-lg text-[13px] font-medium text-sidebar-text transition-all duration-150 hover:bg-sidebar-hover hover:text-white active:scale-[0.98] disabled:opacity-60"
      style={{ width: 'calc(100% - 1rem)' }}
    >
      <span className="material-symbols-outlined text-[18px] w-5 text-center opacity-90 group-hover:opacity-100 shrink-0">
        {icon}
      </span>
      <span className="truncate flex-1 text-left">{loading ? 'Opening…' : label}</span>
    </button>
  );
}
