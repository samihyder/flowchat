'use client';

import { useId, useState, type ReactNode } from 'react';

/** Inline info icon with hover / focus tooltip for size guidance. */
export function InfoHint({ children, label = 'More info' }: { children: ReactNode; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex items-center justify-center size-5 rounded-full text-primary-600/80 hover:text-primary-700 hover:bg-primary-50 transition-colors"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden>
          info
        </span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 max-w-[min(16rem,70vw)] rounded-lg border border-primary-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700 shadow-lg"
        >
          {children}
          <span
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white drop-shadow"
            aria-hidden
          />
        </span>
      )}
    </span>
  );
}
